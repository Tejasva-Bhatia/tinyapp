const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const bcrypt = require("bcryptjs");

app.set("view engine", "ejs");

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

const generateRandomString = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
};
//helper function
const getUserByEmail = function (email) {
  for (const userId in users) {
    if (users[userId].email === email) {
      return users[userId];
    }
  }
  return null;
};

// Create a function to filter URLs for a specific user
const urlsForUser = function (id) {
  const userURLs = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      userURLs[shortURL] = urlDatabase[shortURL];
    }
  }
  return userURLs;
};


const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
};

//body parser
app.use(express.urlencoded({ extended: true }));  //data submitted using post request is in non human readable form, converts buffer into string.

app.get("/", (req, res) => {
  res.send("Hello!");
});
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    res.status(403).send("<html><body>You must be logged in to access URLs.</body></html>");
  } else {
    const userURLs = urlsForUser(user_id);
    const templateVars = { urls: userURLs, user: users[user_id] };
    res.render("urls_index", templateVars);
  }

});

// login route
app.get("/login", (req, res) => {
  const user_id = req.cookies.user_id;
  if (user_id) {
    res.redirect("/urls");
  } else {
    const templateVars = { urls: urlDatabase, user: users[user_id] };
    res.render("user_login", templateVars);
  }

});


app.get("/register", (req, res) => {

  if (req.cookies.user_id) {
    res.redirect("/urls");
  } else {
    const templateVars = { urls: urlDatabase, user: users[req.cookies.user_id] };
    res.render("user_registration", templateVars);
  }
});

//register
app.post("/register", (req, res) => {
  const user_id = generateRandomString();
  const user_email = req.body.email;
  const user_password = req.body.password;
  const hashedPassword = bcrypt.hashSync(user_password, 10);
  if (!user_email || !user_password) {
    return res.status(400).send("Email and password cannot be empty.");
  }

  // Check if email already exists
  if (getUserByEmail(user_email)) {
    return res.status(400).send("Email already exists. Please choose a different email.");
  }


  const newUser = {
    id: user_id,
    email: user_email,
    password: hashedPassword,
  };
  users[user_id] = newUser;

  console.log(users);
  res.cookie('user_id', user_id);
  res.redirect('/urls');
});

app.get("/urls/new", (req, res) => {
  const user_id = req.cookies.user_id;
  if (user_id) {
    const templateVars = { user: users[user_id] };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }

});


app.get("/urls/:id", (req, res) => {

  const user_id = req.cookies.user_id;
  const shortURL = req.params.id;

  if (!user_id) {
    return res.status(403).send("You must be logged in to view this URL.");
  }
  if (!urlDatabase[shortURL] || urlDatabase[shortURL].userID !== user_id) {
    return res.status(404).send("URL not found or you don't have permission to view it.");
  }

  const templateVars = { id: req.params.id, longURL: urlDatabase[req.params.id].longURL, user: users[user_id] };
  res.render("urls_show", templateVars);
});
//delete entry from database
app.post("/urls/:id/delete", (req, res) => {
  const user_id = req.cookies.user_id;
  const idToRemove = req.params.id;
  if (!urlDatabase[idToRemove]) {
    return res.status(404).send("URL not found.");
  }
  if (!user_id) {
    return res.status(403).send("You must be logged in to delete this URL.");
  }
  if (urlDatabase[idToRemove].user_id !== user_id) {
    return res.status(403).send("You don't have permission to delete this URL.");
  }
  delete urlDatabase[idToRemove];
  res.redirect('/urls');
});

// To update a longUrl from id we get from post request
app.post("/urls/:id", (req, res) => {
  const idToUpdate = req.params.id;
  const newLongUrl = req.body.longURL;
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(403).send("You must be logged in to view this URL.");
  }
  if (!urlDatabase[idToUpdate] || urlDatabase[idToUpdate].userID !== user_id) {
    return res.status(404).send("URL not found or you don't have permission to view it.");
  }
  urlDatabase[idToUpdate].longURL = newLongUrl;

  res.redirect('/urls');
});

app.post("/login", (req, res) => {
  const user_email = req.body.email;
  const user_password = req.body.password;
  const user = getUserByEmail(user_email);

  if (!user) {
    res.status(403).send("User not found");
    return;
  }

  if (!bcrypt.compareSync(user_password, user.password)) {
    res.status(403).send("Incorrect password");
    return;
  }

  res.cookie('user_id', user.id);
  res.redirect('/urls');


});

//remove cookie and implement logout
app.post("/logout", (req, res) => {

  res.clearCookie('user_id');
  res.redirect('/login');
});

app.post("/urls", (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    res.status(403).send("You must be logged in to shorten URLs.");
    return;
  }

  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: user_id,
  };
  res.redirect(`/urls/${shortURL}`);

  console.log(req.body); // Log the POST request body to the console
  // res.send("Ok"); // Respond with 'Ok' (we will replace this)
});

app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL].longURL;
  if (!longURL) {
    res.status(404).send("Id does not exist");
  } else {
    res.redirect(longURL);
  }
});



app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});