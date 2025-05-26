from cantools import config

REMINDER = """Hello!

You have committed to the following activities tomorrow:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/cal'>here</a> to review your calendar.

That's it!"""

RESCHED = """Hello!

You volunteered for this task:

%s

The task has been %s, so your commitment record has been removed.

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/cal'>here</a> to review your calendar.

That's it!"""
