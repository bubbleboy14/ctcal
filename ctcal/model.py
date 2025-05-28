from datetime import datetime, timedelta
from math import ceil
from cantools import db
from cantools.util import log
from cantools.web import send_mail
from calTemplates import REMINDER, RESCHED

class Timeslot(db.TimeStampedBase):
    schedule = db.String(choices=["once", "daily", "weekly", "exception", "offday",
        "biweekly (even)", "biweekly (odd)", "monthly (date)", "monthly (day)"])
    when = db.DateTime()
    duration = db.Float() # hours

    def stewardship(self):
        return Stewardship.query(Stewardship.timeslots.contains(self.key.urlsafe())).get()

    def task(self):
        return Task.query(Task.timeslots.contains(self.key.urlsafe())).get()

    def slotter(self):
        return self.task() or self.stewardship()

    def beforeedit(self, edits):
        sched = edits.get("sched")
        if sched == "daily" or sched == "weekly" and self.schedule == "once":
            return
        task = self.task()
        task and task.downschedule()

    def beforeremove(self, session):
        slotter = self.slotter()
        if slotter: # no slotter if slotter is deleting itself....
            slotter.timeslots = list(filter(lambda x : x != self.key, slotter.timeslots))
            slotter.put(session)

class Stewardship(db.TimeStampedBase):
    steward = db.ForeignKey()
    timeslots = db.ForeignKey(kind=Timeslot, repeated=True)

    def task(self):
        return Task.query(Task.commitments.contains(self.key.urlsafe())).get()

    def happening(self, now):
        slots = []
        if self.task().happening(now):
            for slot in db.get_multi(self.timeslots):
                if isDay(slot, now):
                    slots.append(slot)
        if len(slots) == 1: # if 2, one is exception
            return slots[0]

    def beforeremove(self, session):
        task = self.task()
        if task: # no task is task is deleting itself...
            task.unsteward(self)
            task.commitments = list(filter(lambda x : x != self.key, task.commitments))
            task.put(session)

    def afterremove(self, session):
        db.delete_multi(db.get_multi(self.timeslots, session), session)

def isDay(slot, now):
    sched = slot.schedule
    when = slot.when
    if sched == "daily":
        return True
    if sched == "once" or sched == "exception":
        return when.date() == now.date()
    if sched == "monthly (date)":
        return when.day == now.day
    if when.weekday() != now.weekday():
        return
    if sched == "weekly" or sched == "offday":
        return True
    thisweek = ceil(now.day / 7.0)
    if sched == "biweekly (odd)":
        return thisweek % 2
    if sched == "biweekly (even)":
        return not thisweek % 2
    if sched == "monthly (day)":
        tarweek = ceil(when.day / 7.0)
        return tarweek == thisweek

class Task(db.TimeStampedBase):
    editors = db.ForeignKey(repeated=True)
    timeslots = db.ForeignKey(kind=Timeslot, repeated=True)
    commitments = db.ForeignKey(kind=Stewardship, repeated=True)
    name = db.String()
    description = db.Text()
    mode = db.String() # arbitrary
    requirements = db.String(repeated=True)
    steps = db.String(repeated=True)

    def happening(self, now):
        slots = []
        for slot in db.get_multi(self.timeslots):
            if isDay(slot, now):
                slots.append(slot)
        if len(slots) == 1: # if 2, one is exception
            return slots[0]

    def unsteward(self, stewardship, verb="rescheduled"): # just a notifier
        send_mail(to=stewardship.steward.get().email,
            subject="commitment update", body=RESCHED%(self.name, verb))

    def downschedule(self):
        stewz = db.get_multi(self.commitments)
        for stew in stewz:
            self.unsteward(stew, "rescheduled")
        self.commitments = []
        self.put()
        db.delete_multi(stewz)

    def beforeremove(self, session):
        for stew in db.get_multi(self.commitments, session):
            self.unsteward(stew, "removed")

    def afterremove(self, session):
       db.delete_multi(db.get_multi(self.timeslots + self.commitments, session), session)

def remind(namer=None):
    log("remind!", important=True)
    tomorrow = datetime.now() + timedelta(1)
    reminders = {}
    for stew in Stewardship.query().all():
        person = db.get(stew.steward)
        if person.remind:
            slot = stew.happening(tomorrow)
            if slot:
                task = stew.task()
                log("remind: %s (%s)"%(task.name, task.mode))
                ukey = person.key.urlsafe()
                if ukey not in reminders:
                    reminders[ukey] = []
                name = namer and namer(task) or task.name
                reminders[ukey].append("%s at %s"%(name, slot.when.strftime("%H:%M")))
    for pkey in reminders:
        db.KeyWrapper(pkey).get().notify("commitment reminder",
            REMINDER%("\n".join(reminders[pkey]),))