const path = require('path');
const fs = require('fs');
const spawn = require('child_process').spawn;

const username = process.env.GRR_USER;
const password = process.env.GRR_PASSWORD;
const url = `https://${username}:${password}@github.com/${username}/GrrHost.git`;
const ghPageUrl = `http://${username}.github.io/GrrHost`;
const local = path.resolve( __dirname, '../grrhost' );
const branch = 'gh-pages';
const cloneOpts = [];

exports.git = {
  run: function run(command, cbk) {
    return new Promise((resolve, reject) => {
      console.log('spawn', command);
      const cmd = spawn(command);
      cmd.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });

      cmd.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });

      cmd.on('close', (code) => {
        if (code !== 0) {
          console.error('spawn', code);
          reject(`spawn exited with code ${code}`);
        }
        else {
          console.log('spawn success');
          resolve();
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
          && git config --global user.email "alexandre.hoyau+grrhosting-bot@gmail.com" \
          && git config --global user.name "Grrhosting Bot" \
          `)
        .then(() => {
          if(cbk) cbk();
        });
      }
      else {
        // existing repo
        console.log('opening repo');
        this.run(`cd ${local} && git checkout ${branch} && git pull --rebase origin ${branch}`)
        .then(() => {
          if(cbk) cbk();
        });
      }
    });
  },
  publish: function publish(zipedFile) {
    return new Promise((resolve, reject) => {
      const newFolder = '/' + Math.round(Math.random() * 100000);
      this.run(`unzip ${zipedFile} -d ${local + newFolder}`)
      .then(() => {
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
        this.run(`cd ${local} && git add * && git commit -am "commit ${newFolder}" && git push origin ${branch}`)
        .then(() => {
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
