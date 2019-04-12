module.exports = function(robot) {
  const msgList = [

    {
      hour:"10-21",
      min: "00",
      day:"1-5",
      date:"*",
      msg:"<!channel>",
      room:""
    },

    {
      hour:"10-20",
      min: 27,
      day:"1-5",
      date:"*",
      msg:"<!channel>",
      room:""
    }

  ];
  //send reports to envelope.room
  const envelope = {room: ""};

  const cron = require('cron').CronJob;
  const { exec } = require('child_process');
  const fs = require('fs');
  const FILE_TOKEN_TXT = './set_values/token.txt';
  const fstoken = fs.readFileSync(FILE_TOKEN_TXT, "utf-8");
  const token = fstoken.trim();
  
  //send message
  const throwMsgstr = (str,res) => robot.send(envelope, `\`${str}\``);
  const slackMsgstr = str => `\`${str}\``;

  const postMsg = function(argnum,postmsg,slackroom) {
    const cmd = `curl -XPOST -d "token=${token}" -d "as_user=true" -d "channel=${slackroom}" -d "text=${postmsg}" https://slack.com/api/chat.postMessage`;
    return exec(cmd, function(error, stdout, stderr) {
      const obj = JSON.parse(stdout);
      if (obj.error) {
        job[argnum].stop();
        throw throwMsgstr(`exec error: ${obj.error}`,robot);
      } else {
        robot.send(envelope, `\`DONE: ${stdout}\``);
      }
    });
  };
  
  const completeFunc = argnum => job[argnum].stop();

  const mainfunc = (arg1,arg2,n) => {
    const promise = Promise.resolve();
    return promise
      .then(postMsg(n, arg1, arg2))
      .then(completeFunc(n));
  };

  var job = [];
  const returnJob = n => {
    return job[n] = new cron({
      cronTime: `${msgList[n].min} ${msgList[n].hour} ${msgList[n].date} * ${msgList[n].day}`,
      onTick() {
        mainfunc(msgList[n].msg ,msgList[n].room ,n);
      },
      start: false,
      timeZone: 'Asia/Tokyo'
    });
  };

  returnJob(0);
  returnJob(1);

  //start & stop
  robot.respond(/sleepjob/i, function(msg) {
    for (let i = 0; i < job.length; i++) {
      const jobcont = job[i];
      job[i].stop();
    }
    return msg.send(slackMsgstr('cancel msg : job stopped'));
  });

  robot.respond(/startjob/i, function(msg) {
    for (let i = 0; i < job.length; i++) {
      const jobcont = job[i];
      job[i].start();
    }
    return msg.send(slackMsgstr('status: job started'));
  });

  return robot.respond(/jobstatus/i, function(msg) {
    let returnStatusLog =  '';
    returnStatusLog += '■Task list & status\n';
    for (let i = 0; i < job.length; i++) {
      const jobcont = job[i];
      returnStatusLog += `job No.${[i]} ====>  cronTime : ${job[i].cronTime.source} /// status : ${job[i].running} ///\n`;
    }
    return setTimeout(() => msg.send(`\`\`\`${returnStatusLog}\`\`\``)
    , 100);
  });
};