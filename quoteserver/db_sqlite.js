
var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var db;
var dbfile = './quotes.db';
var db_exists = fs.existsSync(dbfile);

function opendbfile() {
    db = new sqlite3.Database(dbfile);
    db.serialize(create_tables);
}

function create_tables() {
    db.serialize(function () {
        db.run('CREATE TABLE IF NOT EXISTS `quotes` (' +
            '`id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,' +
            '`author` TEXT,' +
            '`quotetext` TEXT)');
        if (!db_exists) {
            initalizequotes();
        } else {
            console.log("Using existing db file");
        }
        db.run('CREATE TABLE IF NOT EXISTS `history` (' +
            '`id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,' +
            '`quoteid` INTEGER,' +
            '`time` INTEGER,' +
            '`author` TEXT,' +
            '`quotetext` TEXT)');
        if (!db_exists) {
            initializehistory();
        }
    });
}

function initalizequotes(callback) {
    var quotedata = [
        { author: 'Benjamin Franklin', quotetext: "An investment in knowledge pays the best interest." },
        { author: 'Herbert Spencer', quotetext: "The great aim of education is not knowledge but action." },
        { author: 'Nelson Mandela', quotetext: "Education is the most powerful weapon which you can use to change the world." },
        { author: 'Mark Twain', quotetext: "Don't let schooling interfere with your education." },
        { author: 'Frank Zappa', quotetext: "If you want to get laid, go to college. If you want an education, go to the library." },
        { author: 'Leonardo da Vinci', quotetext: "Poor is the pupil who does not surpass his master." },
        { author: "Douglas Adams", quotetext: "A common mistake that people make when trying to design something completely foolproof is to underestimate the ingenuity of complete fools." },
        { author: "Adam Osborne", quotetext: "People think computers will keep them from making mistakes. They're wrong. With computers you make mistakes faster." },
        { author: "Arthur C. Clarke", quotetext: "Any sufficiently advanced technology is indistinguishable from magic." },
        { author: "Jamie Zawinski", quotetext: "Software Engineering might be science; but that's not what I do. I'm a hacker, not an engineer." },
        { author: "Yoda", quotetext: "Do, or do not. There is no 'try'." },
        { author: "Bjarne Stroustrup", quotetext: "C makes it easy to shoot yourself in the foot; C++ makes it harder, but when you do, it blows away your whole leg." },
        { author: "Albert Einstein", quotetext: "Make everything as simple as possible, but not simpler." },
        { author: "Wilson Mizner", quotetext: "Copy from one, it's plagiarism; copy from two, it's research." },
        { author: "Slartibartfast", quotetext: "Science has achieved some wonderful things of course, but I'd far rather be happy than right any day." },
        { author: "John Perry Barlow", quotetext: "Relying on the government to protect your privacy is like asking a peeping tom to install your window blinds." }
    ];
    var stmt = db.prepare("INSERT INTO `quotes` (`author`, `quotetext`) VALUES (?,?)");
    for (var i = 0; i < quotedata.length; ++i) {
        stmt.run(quotedata[i].author, quotedata[i].quotetext);
    }
    stmt.finalize(callback);
}

function initializehistory() {
    var stmt = db.prepare("INSERT INTO `history` (`quoteid`, `author`, `quotetext`, `time`) VALUES (?,?,?,?)");
    readall(function (quotes) {
        for (var i = 0; i < quotes.length; ++i) {
            var quote = quotes[i];
            stmt.run(quote.id, quote.author, quote.quotetext, new Date().getTime());
        }
    })
}

function readall(callback) {
    var quotes = [];
    db.all("SELECT id, author, quotetext FROM quotes", function (err, rows) {
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            quotes.push({ 'id': row.id, 'author': row.author, 'quotetext': row.quotetext });
        }
        callback(quotes);
    });
}

function findone(id, callback) {
    db.get("SELECT id, author, quotetext FROM quotes WHERE id=?", id, function (err, row) {
        if (row === undefined)
            callback();
        else {
            quote = { 'id': row.id, 'author': row.author, 'quotetext': row.quotetext };
            db.all("SELECT quoteid, author, quotetext, time from history WHERE quoteid=?", row.id, function (err, rows) {
                var history = [];
                for (var i = 0; i < rows.length; i++) {
                    var hrow = rows[i];
                    history.push({ "quoteid": hrow.quoteid, "author": hrow.author, "quotetext": hrow.quotetext, "time": hrow.time });
                }
                quote.history = history;
                callback(quote);
            })
        }
    });
}

function populate(callback) {
    db.serialize(function () {
        deleteall(function (deletecount) {
            initalizequotes(initializehistory);
            
        });
    });
    callback();
}

function deleteall(callback) {
    db.run("DELETE FROM quotes", function (err) {
        var changecount = this.changes;
        db.run("DELETE FROM history", function (err) {
            callback(changecount);
        })
    });
}

function deletequote(id, callback) {
    db.run("DELETE FROM quotes WHERE id=?", id, function (err) {
        if (err || !this.changes) {
            callback(null, err || 'nothing deleted');
        } else {
            callback('success');
        }
    });
}

function createquote(quote, callback) {
    // no error handling, should fix..
    db.run("INSERT INTO `quotes` (`author`, `quotetext`) VALUES (?,?)",
        [quote.author, quote.quotetext],
        function (err) {
            callback(this.lastID);
        });
}

function updatequote(quote, callback) {
    db.run("UPDATE quotes SET author=$author, quotetext=$quotetext WHERE id=$id",
        { $id: quote.id, $author: quote.author, $quotetext: quote.quotetext },
        function (err) {
            if (this.changes === 0) callback("No quote with id: " + quote.id);
            else {
                db.run("INSERT INTO `history` (`quoteid`, `author`, `quotetext`, `time`) VALUES (?,?,?,?)",
                    [quote.id, quote.author, quote.quotetext, new Date().getTime()],
                    function (err) {
                        callback(err);
                    });
            }
        });
}

opendbfile();

module.exports = { readall, findone, deleteall, createquote, updatequote, deletequote, populate };
