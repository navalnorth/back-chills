const express = require('express');
const router = express.Router();
require('dotenv').config();
const https = require('https');

/**
 * @swagger
 * /{name}:
 *   get:
 *     summary: Récupère l'ID IMDb d'un acteur par son nom
 *     description: "Cette route permet de récupérer l'ID IMDb d'un acteur en fonction de son nom en utilisant l'API moviesminidatabase."
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: "Le nom de l'acteur pour lequel récupérer l'ID IMDb."
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "Succès de la requête, renvoie l'ID IMDb de l'acteur."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: "ID IMDb de l'acteur."
 *       500:
 *         description: "Erreur lors de la communication avec l'API externe."
 */
router.get('/:name', async (req, res) => {
    try {
        const name = req.params.name;

        // Encodage de l'URL
        const encodedName = encodeURIComponent(name);

        const optionActorId = {
            method: 'GET',
            hostname: 'moviesminidatabase.p.rapidapi.com',
            port: null,
            path: `/actor/imdb_id_byName/${encodedName}/`,
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                'x-rapidapi-host': process.env.HOST
            }
        };

        const getActorId = () => {
            return new Promise((resolve, reject) => {
                const externalReq = https.request(optionActorId, (externalRes) => {
                    const chunks = [];

                    externalRes.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    externalRes.on('end', () => {
                        try {
                            const body = Buffer.concat(chunks).toString();
                            const jsonResponse = JSON.parse(body);
                            resolve(jsonResponse);
                        } catch (error) {
                            reject(new Error('Erreur lors de l\'analyse JSON de la réponse de l\'API acteur.'));
                        }
                    });
                });

                externalReq.on('error', (error) => {
                    console.error('Erreur lors de la requête API pour l\'acteur:', error);
                    reject(new Error('Erreur lors de la communication avec l\'API externe pour l\'acteur'));
                });

                externalReq.end();
            });
        };

        const actorId = await getActorId();
        console.log(actorId);

        let imdbId;
        if (actorId.results && actorId.results.length > 0) {
            imdbId = actorId.results[0].imdb_id;
        }

        if (!imdbId) {
            return res.status(404).send({ message: 'Acteur non trouvé.' });
        }

        console.log(`ID IMDb de l'acteur: ${imdbId}`);

        const optionMovieByActorId = {
            method: 'GET',
            hostname: 'moviesminidatabase.p.rapidapi.com',
            port: null,
            path: `/movie/byActor/${imdbId}/`,
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                'x-rapidapi-host': process.env.HOST
            }
        };

        const movieByActorId = () => {
            return new Promise((resolve, reject) => {
                const externalReq = https.request(optionMovieByActorId, (externalRes) => {
                    const chunks = [];

                    externalRes.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    externalRes.on('end', () => {
                        try {
                            const body = Buffer.concat(chunks).toString();
                            const jsonResponse = JSON.parse(body);
                            resolve(jsonResponse);
                        } catch (error) {
                            reject(new Error('Erreur lors de l\'analyse JSON de la réponse de l\'API des films.'));
                        }
                    });
                });

                externalReq.on('error', (error) => {
                    console.error('Erreur lors de la requête API pour les films:', error);
                    reject(new Error('Erreur lors de la communication avec l\'API externe pour les films'));
                });

                externalReq.end();
            });
        };

        const filmByActor = await movieByActorId();

        const idFilm = []; // Initialisation d'un tableau pour stocker les IDs
        const films = [];

        // Vérification de l'existence de 'results' avant de tenter un 'forEach'
        if (filmByActor && Array.isArray(filmByActor.results)) {
            filmByActor.results.forEach((filmData) => {
                const movieDetails = filmData[0]; // Premier élément, contenant imdb_id et title
                idFilm.push(movieDetails.imdb_id); // Stocke l'ID IMDb dans le tableau
            });
        } else {
            console.error('Aucun film trouvé pour cet acteur.');
            return res.status(404).send({ message: 'Aucun film trouvé pour cet acteur.' });
        }

        // Fonction pour récupérer les détails du film par son ID
        const getMovieById = (imdbId) => {
            const optionMovieById = {
                method: 'GET',
                hostname: 'moviesminidatabase.p.rapidapi.com',
                port: null,
                path: `/movie/id/${imdbId}/`,
                headers: {
                    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                    'x-rapidapi-host': process.env.HOST
                }
            };

            return new Promise((resolve, reject) => {
                const externalReq = https.request(optionMovieById, (externalRes) => {
                    const chunks = [];

                    externalRes.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    externalRes.on('end', () => {
                        try {
                            const body = Buffer.concat(chunks).toString();
                            const jsonResponse = JSON.parse(body);
                            resolve(jsonResponse);
                        } catch (error) {
                            reject(new Error('Erreur lors de l\'analyse JSON de la réponse de l\'API des détails de film.'));
                        }
                    });
                });

                externalReq.on('error', (error) => {
                    console.error(`Erreur lors de la requête API pour le film avec l'ID ${imdbId}:`, error);
                    reject(new Error('Erreur lors de la communication avec l\'API externe pour les détails de film.'));
                });

                externalReq.end();
            });
        };

        // Utilisation de la boucle for pour itérer sur chaque ID
        for (let i = 0; i < idFilm.length; i++) {
            try {
                const filmDetails = await getMovieById(idFilm[i]);
                films.push(filmDetails); // Stocker chaque film récupéré
                console.log(filmDetails); // Affiche chaque film récupéré
            } catch (error) {
                console.error(`Erreur lors de la récupération du film avec l'ID ${idFilm[i]}:`, error);
            }
        }

        console.log(films); // Affiche tous les films récupérés

        // Envoyer la réponse avec tous les films récupérés
        res.status(200).send({ resultat: films });

    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        res.status(500).send({ message: 'Erreur lors de la récupération des données' });
    }
});

module.exports = router;
