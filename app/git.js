const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

const username = process.env.GRR_USER;
const password = process.env.GRR_PASSWORD;
const url = `https://${username}:${password}@github.com/${username}/GrrHost.git`;
const ghPageUrl = `http://${username}.github.io/GrrHost`;
const local = path.resolve( __dirname, '..', 'grrhost' );
const branch = 'gh-pages';
const cloneOpts = [];

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
        this.run(`git clone ${url} ${local} \
          && cd ${local} && git checkout ${branch} \
          && git pull --rebase origin ${branch} \
          && git config user.email "alexandre.hoyau+grrhosting-bot@gmail.com" \
          && git config user.name "Grrhosting Bot" \
          `)
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
  publish: function publish(zipedFile) {
    return new Promise((resolve, reject) => {
      const newFolder = '/' + Math.round(Math.random() * 100000);
      this.run(`unzip ${zipedFile} -d ${local + newFolder}`)
      .then((stdout, stderr) => {
        let numFiles = 0;
        let lastFileName;
        fs.readdirSync(local + newFolder).forEach(file => {
          if( !file.startsWith('.') && !file.startsWith('__') ) {
            numFiles++;
            lastFileName = file;
          }
        });
        if(numFiles === 1) {
          const tmp = './tmp';
          try { fs.mkdirSync(tmp); fs.mkdirSync(tmp + newFolder); } catch(e) { console.error('err:', e)};
          fs.renameSync(local + newFolder, tmp + newFolder);
          fs.renameSync(tmp + newFolder + '/' + lastFileName, local + newFolder);
          try { fs.rmdirSync(tmp + newFolder); } catch(e) { console.error('err:', e)};
        }
        this.run(`cd ${local} && git add * \
          && git commit -am "commit ${newFolder}"  \
          && git pull --rebase origin ${branch} \
          && git push origin ${branch}`)
        .then((stdout, stderr) => {
          setTimeout(() => resolve(ghPageUrl + newFolder + '/'), 15000);
        })
        .catch(reject);
      });
    });
  },
  // rewite history to delete a file from all commits
  // all publish operation will fail:
  // `Updates were rejected because the tip of your current branch is behind`
  forget(fileName) {
    return new Promise((resolve, reject) => {
      console.log('forget', fileName);
      this.run(`cd ${local} && git pull --rebase origin ${branch} \
        && git filter-branch -f --index-filter 'git rm -r --cached --ignore-unmatch ${fileName}' HEAD \
        && git push -f origin ${branch}`)
      .then(resolve)
      .catch(reject);
    });
  }
}
