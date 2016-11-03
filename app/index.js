const path = require('path');
const express = require('express');
const app = express();
const git = require('./git').git;

var multer  = require('multer')
var upload = multer({ dest: path.resolve(__dirname, 'uploads/') })

git.init();

app.post('/publish', upload.single('zip'), function (req, res) {
  const zipedFile = req.file.path;
  git.publish(zipedFile).then(url => {
    // res.status(200).send(`<a href="${url}">Published Here!</a>`);
    // res.redirect(url);
    res.setHeader("Access-Control-Allow-Origin", "*");
    const delay = 20;
    res.status(200).send(`<meta http-equiv="refresh" content="${delay};url=${url}"><a href="${url}">You are about to be redirected, please wait or click here in ${delay}s</a>`);
  });
});

app.get('/forget/:name', function (req, res) {
  const name = req.params.name;
  console.log('forget', name);
  git.forget(name).then(url => {
    console.log('forget done', name);
    res.redirect('../');
  }).catch(err => {
    console.log('forget error', name, err);
    res.redirect('../');
  });
});

app.use(express.static('public'));

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('listening on port', port);
});
