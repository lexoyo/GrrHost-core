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
    res.redirect(url);
  });
});

app.use(express.static('public'));

app.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000');
});
