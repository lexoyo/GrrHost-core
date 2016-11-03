const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

const username = process.env.GRR_USER;
const password = process.env.GRR_PASSWORD;
const url = `https://${username}:${password}@github.com/${username}/GrrHost.git`;
const ghPageUrl = `http://${username}.github.io/GrrHost`;
const local = path.resolve( __dirname, '..', 'grrhost' );
const indexTemplatePath = path.resolve( __dirname, 'index.html.tpl' );
const indexTemplateHtml = fs.readFileSync(indexTemplatePath).toString();
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
      const newFolderPathInLocalRepo = local + newFolder;
      this.run(`unzip ${zipedFile} -d ${newFolderPathInLocalRepo}`)
      .then((stdout, stderr) => {
        let numFiles = 0;
        let lastFileName;
        fs.readdirSync(newFolderPathInLocalRepo).forEach(file => {
          if( !file.startsWith('.') && !file.startsWith('__') ) {
            numFiles++;
            lastFileName = file;
          }
        });
        if(numFiles === 1) {
          const tmp = './tmp';
          const tmpFolderPath = tmp + newFolder;
          try { fs.mkdirSync(tmp); } catch(e) { console.warn('warn: could not create temp folder', tmp, e)};
          try { fs.mkdirSync(tmpFolderPath); } catch(e) { console.error('err: could not create temp folder', tmpFolderPath, e)};
          try { fs.renameSync(newFolderPathInLocalRepo, tmpFolderPath); } catch(e) { console.error('err: could not rename folder', newFolderPathInLocalRepo, 'to', tmpFolderPath, e)};
          try { fs.renameSync(tmpFolderPath + '/' + lastFileName, newFolderPathInLocalRepo); } catch(e) { console.error('err: could not rename folder', tmpFolderPath + '/' + lastFileName, 'to', newFolderPathInLocalRepo, e)};
          try { this.rmdirSyncRecurs(tmpFolderPath); } catch(e) { console.error('err:', e)};
        }
        this.createIndexFiles(newFolderPathInLocalRepo);
        this.run(`cd ${local} && git add * \
          && git commit -am "commit ${newFolder}"  \
          && git pull --rebase origin ${branch} \
          && git push origin ${branch}`)
        .then((stdout, stderr) => {
          resolve(ghPageUrl + newFolder + '/');
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
        && git push origin ${branch}`)
      .then(resolve)
      .catch(reject);
    });
  },
  rmdirSyncRecurs: function rmdirSyncRecurs(path) {
    if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach((file, index) => {
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) { // recurse
          this.rmdirSyncRecurs(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  },
  createIndexFiles: function createIndexFiles(path) {
    if( fs.existsSync(path) ) {
      const files = fs.readdirSync(path);
      files.forEach((file, index) => {
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) { // recurse
          this.createIndexFiles(curPath);
        } else {
        }
      });
      // index file
      if( !fs.existsSync(path + '/index.html') ) {
        const filesList = '<ul>' + files.reduce((prev, current) => {
          return prev + `<li><a href="./${current}">${current}</a></li>`;
        }, '') + '</ul>';
        const content = indexTemplateHtml
          .replace('{{path}}', path.substr(local.length))
          .replace('{{filesList}}', filesList);
        fs.writeFileSync(path + '/index.html', content);
      }
    }
  }
}
