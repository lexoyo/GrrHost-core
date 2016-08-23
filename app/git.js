const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

const username = process.env.GRR_USER;
const password = process.env.GRR_PASSWORD;
const url = `https://${username}:${password}@github.com/${username}/GrrHost.git`;
const ghPageUrl = `http://${username}.github.io/GrrHost.git`;
const local = path.resolve( __dirname, '../grrhost' );
const branch = 'gh-pages';
const cloneOpts = [];
console.log('xxx')

exports.git = {
  run: function run(command, cbk) {
    return new Promise((resolve, reject) => {
      console.log('exec', command);
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('exec', error);
          reject(`exec error: ${error}`);
        }
        else {
          console.log('exec', stdout, stderr);
          resolve(stdout, stderr);
        }
      });
    });
  },
  init: function init(cbk) {
    console.log('init', local, url);
    fs.stat( local, (err, stats) => {
      if(err) {
        // clone repo
        console.log('cloning repo');
        this.run(`git clone ${url} ${local} && cd ${local} && git checkout ${branch} && git pull --rebase origin ${branch}`)
        .then((stdout, stderr) => {
          if(cbk) cbk();
        });
      }
      else {
        // existing repo
        console.log('opening repo');
        this.run(`cd ${local} && git checkout ${branch} && git pull --rebase origin ${branch}`)
        .then((stdout, stderr) => {
          if(cbk) cbk();
        });
      }
    });
  },
  publish: function publish() {
    return new Promise((resolve, reject) => {
      const newFolder = 'test' + Math.round(Math.random() * 100000);
      fs.mkdirSync( path.resolve( local, newFolder ));
      fs.writeFileSync( path.resolve( local, newFolder, '.keep' ), '');
      this.run(`cd ${local} && git add * && git commit -am "commit ${newFolder}" && git push origin master`)
      .then((stdout, stderr) => {
        resolve(ghPageUrl);
      })
      .catch(reject);
    });
  }
}
