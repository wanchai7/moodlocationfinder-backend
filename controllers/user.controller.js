const UserModel = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const secret = process.env.SECRET;

exports.register = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send({
      message: "Please provide username and password",
    });
  }
  const existingUser = await UserModel.findOne({ username });
  if (existingUser) {
    return res.status(400).send({
      message: "This username is already existed",
    });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const user = await UserModel.create({
      username,
      password: hashedPassword,
    });
    res.status(201).send({
      message: "User registered successfully",
    });
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "Some errors occurred while registering a new user",
    });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send({
      message: "Please provide username and password",
    });
  }
  try {
    const userDoc = await UserModel.findOne({ username });
    if (!userDoc) {
      return res.status(404).send({ message: "User not found" });
    }
    const isPasswordMatched = bcrypt.compareSync(password, userDoc.password);
    if (!isPasswordMatched) {
      return res.status(401).send({ message: "Invalid credentials" });
    }
    //login successfully
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) {
        return res.status(500).send({
          message: "Internal server error: Authentication failed",
        });
      }
      //token generation
      res.send({
        message: "เข้าสู่ระบบสำเร็จ",
        id: userDoc._id,
        username,
        accessToken: token,
      });
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some errors occurred while logging in user",
    });
  }
};
