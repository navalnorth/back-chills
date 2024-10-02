const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const mysql = require("mysql2");
require("dotenv").config();
const connectToDb = require("../db.js");
const jwt = require("jsonwebtoken");



router.post("/favoris/:id", async (req, res) => {
  try {
    const db = await connectToDb();
    if (!db) { return res.status(500).json({ message: "Erreur de connexion à la base de données" })}

    const userId = req.params.id
    const { id_filmAPI } = req.body

    const [dejaFavori] = await db.query( 'SELECT * FROM favori WHERE id_user = ? AND id_filmAPI = ?', [userId, id_filmAPI] )
    if (dejaFavori.length > 0) { return res.status(400).json({ message: "Le film est dèja dans vos favoris."}) }

    await db.query( "INSERT INTO favori (id_user, id_filmAPI) VALUES (?, ?)", [userId, id_filmAPI])

    return res.status(201).json({ message: "Film ajouté aux favoris avec succès !"})
  } catch (err) {
    console.error("Erreur lors de l'ajout du film aux favoris :", err);
    return res.status(500).json({ message: "Erreur interne du serveur." });
  }
});



module.exports = router