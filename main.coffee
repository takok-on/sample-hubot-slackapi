module.exports = (robot) ->
  msgList = [

    {
      hour:"10-21"
      min: "00"
      day:"1-5"
      date:"*"
      msg:"<!channel>"
      room:""
    }

    {
      hour:"10-20"
      min: 27
      day:"1-5"
      date:"*"
      msg:"<!channel>"
      room:""
    }

  ]
  #send reports to envelope.room
  envelope = room: ""

  cron = require('cron').CronJob
  exec = require('child_process').exec
  fs = require 'fs'
  FILE_TOKEN_TXT = './set_values/token.txt'
  fstoken = fs.readFileSync FILE_TOKEN_TXT, "utf-8"
  token = fstoken.trim()
  
  #send message
  throwMsgstr = (str,res) ->
    robot.send envelope, '`'+str+'`'
  slackMsgstr = (str) ->
    return '`'+str+'`'

  postMsg = (argnum,postmsg,slackroom) ->
    cmd = 'curl -XPOST -d "token=' + token + '" -d "as_user=true" -d "channel=' + slackroom + '" -d "text=' + postmsg + '" https://slack.com/api/chat.postMessage'
    exec(cmd, (error, stdout, stderr) ->
      obj = JSON.parse(stdout)
      if obj.error
        job[argnum].stop()
        throw throwMsgstr 'exec error: ' + obj.error,robot
      else
        robot.send envelope, '`'+'DONE: ' + stdout+'`'
      return
    )

  completeFunc = (argnum) ->
    job[argnum].stop()

  mainfunc = (arg1,arg2,n) =>
    promise = Promise.resolve()
    promise
      .then(postMsg(n, arg1, arg2))
      .then(completeFunc n)

  job = []
  returnJob = (n) =>
    job[n] = new cron(
      cronTime: '' + msgList[n].min + ' ' + msgList[n].hour + ' ' + msgList[n].date + ' * ' + msgList[n].day + ''
      onTick: ->
        mainfunc msgList[n].msg ,msgList[n].room ,n
        return
      start: false
      timeZone: 'Asia/Tokyo'
    )

  returnJob 0
  returnJob 1

  #start & stop
  robot.respond /sleepjob/i, (msg) ->
    for jobcont,i in job
      job[i].stop()
    msg.send slackMsgstr 'cancel msg : job stopped'

  robot.respond /startjob/i, (msg) ->
    for jobcont,i in job
      job[i].start()
    msg.send slackMsgstr 'status: job started'

  robot.respond /jobstatus/i, (msg) ->
    returnStatusLog =  ''
    returnStatusLog += '■Task list & status\n'
    for jobcont,i in job
      returnStatusLog += 'job No.'+[i]+' ====>  cronTime : ' + job[i].cronTime.source + ' /// status : '+ job[i].running + ' ///\n'
    setTimeout ->
      msg.send '```' + returnStatusLog + '```'
    , 100
