const express = require('express');
const app = express();
const git = require('./git').git;

git.init();

app.post('/publish', function (req, res) {
  git.publish().then((url) => {
    res.send('Published!', url);
  });
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
