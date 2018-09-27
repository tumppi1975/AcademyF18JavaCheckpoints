var express = require('express');
var router = express.Router();
var db = require('./db_sqlite');

// Set JSON to be the content type for all requests
router.use(function (req, res, next) {
  res.set('Content-Type', 'application/json');
  next();
});

// Route for all quotes:
// GET and DELETE all quotes
router.route('/')
    .get(function(req, res, next) {
      db.readall(function(quotes, err) {
        if (err) res.status(500).send(JSON.stringify(err.message));
        else res.send(JSON.stringify(quotes));
      });
    })
    .delete(function(req, res){
      db.deleteall(function(deletecount) {
        // console.log('Deleted quotes: ' + deletecount);
        res.send(JSON.stringify({deletedcount: deletecount}));
      })
    })
    .post(function(req, res){
        console.log(req.body);
        if (!req.body.quotetext) {
            res.status(400).send({error: 'empty quotetext in received JSON document'});
            return;
        }
        db.createquote(req.body, function(newid) {
            res.status(201).set("Location", '/api/quote/'+newid).send();
        });
    })
;

// Initialize all messages, first deletes all previous messages
router.put('/reset', function(req, res){
  db.populate(function(createcount){
    res.status(201).send(JSON.stringify({url: '/api/', count: createcount}));
  })
});

router.route('/:id')
    .get(function(req, res){
      db.findone(req.params.id, function(quote) {
        if(!quote) res.status(404);
        res.send(JSON.stringify(quote));
      });
    })
    .delete(function(req, res, next){
      db.deletequote(req.params.id, function(deletecount, errmsg) {
          if (!errmsg)
            res.send(JSON.stringify({deleted: deletecount}));
          else
            res.status(400).send(JSON.stringify({error: errmsg}));
      });
    })
    .put(function(req, res){
        const quote = req.body;
        quote.id = req.params.id;
        db.updatequote(quote, function(err) {
            if (err) {
              console.log(err);
              res.status(400).send(JSON.stringify({error: err}));
            }
            else {
              res.send(JSON.stringify({updated: "/api/quote/"+quote.id}));
            }
      });
    })
;

module.exports = router;
