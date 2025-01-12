const express = require('express');
const fs = require("fs");
const multer = require('multer');
const path = require('path');
const sqlite = require("sqlite3").verbose();
const bodyParser = require('body-parser'); // Assurez-vous d'importer body-parser
const app = express();
const session = require('express-session');
const PORT = 8080;

app.use(session({
    secret: 'ras', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Mettez à true si vous utilisez HTTPS
}));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'image/'); // Dossier où les images seront stockées
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Renommer le fichier
    }
});
const upload = multer({ storage: storage });

// Middleware pour analyser les données du formulaire
app.use(express.urlencoded());
app.use(express.json());
app.use("/image", express.static(__dirname + "/image/"));
app.use("/css", express.static(__dirname + "/css/"));
app.use("/js", express.static(__dirname + "/js/"));

const db = new sqlite.Database('./Bénévolat.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connecté à la base de données');    
    }});
    

app.get("/", (req, res) => {
    const indexHTML = fs.readFileSync(__dirname + "/html/index.html", "utf-8");
    res.send(indexHTML);
});

app.get("/login1.html", (req, res) => {
    const loginHTML = fs.readFileSync(__dirname + "/html/login1.html", "utf-8");
    res.send(loginHTML);
});

app.get("/register1.html", (req, res) => {
    const registerHTML = fs.readFileSync(__dirname + "/html/register1.html", "utf-8");
    res.send(registerHTML);
});

app.get("/login2.html", (req, res) => {
    const loginHTML = fs.readFileSync(__dirname + "/html/login2.html", "utf-8");
    res.send(loginHTML);
});

app.get("/register2.html", (req, res) => {
    const registerHTML = fs.readFileSync(__dirname + "/html/register2.html", "utf-8");
    res.send(registerHTML);
});

app.get("/admin.html", (req, res) => {
    const loginHTML = fs.readFileSync(__dirname + "/html/admin.html", "utf-8");
    res.send(loginHTML);
});

app.get("/calendrier_user.html", (req, res) => {
    const userId = req.session.userId; 
    if (!userId) {
        return res.redirect('/login2.html'); 
    }

    const sql = 'SELECT name, image FROM User_regist WHERE id = ?';
    db.get(sql, [userId], (err, user) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des informations de l\'utilisateur.');
        }

        let calendarHTML = fs.readFileSync(__dirname + "/html/calendrier_user.html", "utf-8");
        calendarHTML = calendarHTML.replace('{{userImage}}', user.image || '/image/default.png'); // Remplacer l'image
        res.send(calendarHTML);
    });
});

app.get('/api/user_missions', (req, res) => {
    const userId = req.session.userId; 
    if (!userId) {
        return res.status(403).send('Non autorisé'); 
    }

    const sql = `
        SELECT M.titre, M.date_debut, M.date_fin 
        FROM Mission_benevole MB
        JOIN Missions M ON MB.mission_id = M.id
        WHERE MB.benevole_id = ?`;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des missions.');
        }
        res.json(rows);
    });
});

app.get("/user.html", (req, res) => {
    const loginHTML = fs.readFileSync(__dirname + "/html/user.html", "utf-8");
    res.send(loginHTML);
});

app.get("/dashboard.html", (req, res) => {
    const adminId = req.session.administrateurId; 
    if (!adminId) {
        return res.redirect('/login1.html'); 
    }

    const sql = 'SELECT name, image FROM Admin_regist WHERE id = ?';
    db.get(sql, [adminId], (err, admin) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des informations de l\'administrateur.');
        }

        let adminHTML = fs.readFileSync(__dirname + "/html/dashboard.html", "utf-8");

        adminHTML = adminHTML.replace('{{userImage}}', admin.image || '/image/default.png');

        res.send(adminHTML);
    });
});

app.get('/dashboard_user.html', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login2.html'); // Rediriger si l'utilisateur n'est pas connecté
    }
    const userImage = req.session.userImage;

    let dashboardHTML = fs.readFileSync(__dirname + "/html/dashboard_user.html", "utf-8");

    dashboardHTML = dashboardHTML.replace('{{userImage}}', userImage);

    res.send(dashboardHTML);
});

app.get("/mission_benevole.html", (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login2.html'); // Rediriger si l'utilisateur n'est pas connecté
    }

    const userImage = req.session.userImage; // Récupérer l'image de l'utilisateur

    // Récupérer les missions
    const sqlMissions = 'SELECT id, titre, description FROM Missions';
    db.all(sqlMissions, [], (err, missions) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des missions.');
        }

        // Récupérer les bénévoles
        const sqlBenevoles = 'SELECT id, name FROM User_regist';
        db.all(sqlBenevoles, [], (err, benevoles) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Erreur lors de la récupération des bénévoles.');
            }

            // Lire le fichier HTML
            let adminHTML = fs.readFileSync(__dirname + "/html/mission_benevole.html", "utf-8");

            // Créer les options pour les missions
            const missionOptions = missions.map(mission => 
                `<option value="${mission.id}">${mission.titre}</option>`
            ).join('');

            // Créer les options pour les bénévoles
            const benevoleOptions = benevoles.map(benevole => 
                `<option value="${benevole.id}">${benevole.name}</option>`
            ).join('');

            adminHTML = adminHTML.replace('{{missionOptions}}', missionOptions);
            adminHTML = adminHTML.replace('{{benevoleOptions}}', benevoleOptions);
            adminHTML = adminHTML.replace('{{userImage}}', userImage); // Remplacer l'image de l'utilisateur
            
            res.send(adminHTML);
        });
    });
});

app.get("/send_recompense.html", (req, res) => {
    const adminId = req.session.administrateurId; // Récupérer l'ID de l'administrateur
    if (!adminId) {
        return res.redirect('/login1.html'); // Rediriger si l'administrateur n'est pas connecté
    }

    // Récupérer les missions
    const sqlMissions = 'SELECT id, titre FROM Missions';
    db.all(sqlMissions, [], (err, missions) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des missions.');
        }

        // Récupérer les bénévoles
        const sqlBenevoles = 'SELECT id, name FROM User_regist'; 
        db.all(sqlBenevoles, [], (err, benevoles) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Erreur lors de la récupération des bénévoles.');
            }

            let adminHTML = fs.readFileSync(__dirname + "/html/send_recompense.html", "utf-8");

            const missionRecompense = missions.map(mission => 
                `<option value="${mission.id}">${mission.titre}</option>`
            ).join('');

            const benevoleRecompense = benevoles.map(benevole => 
                `<option value="${benevole.id}">${benevole.name}</option>`
            ).join('');

            adminHTML = adminHTML.replace('{{missionRecompense}}', missionRecompense);
            adminHTML = adminHTML.replace('{{benevoleRecompense}}', benevoleRecompense);
            
            const sqlAdmin = 'SELECT name, image FROM Admin_regist WHERE id = ?';
            db.get(sqlAdmin, [adminId], (err, admin) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).send('Erreur lors de la récupération des informations de l\'administrateur.');
                }

                
                adminHTML = adminHTML.replace('{{userImage}}', admin.image || '/image/default.png'); // Image par défaut si aucune image

                res.send(adminHTML);
            });
        });
    });
});

app.get("/mes_missions.html", (req, res) => {
    const adminId = req.session.administrateurId; 
    if (!adminId) {
        return res.redirect('/login1.html'); 
    }

    let adminHTML = fs.readFileSync(__dirname + "/html/mes_missions.html", "utf-8");

    const sqlAdmin = 'SELECT name, image FROM Admin_regist WHERE id = ?';
    db.get(sqlAdmin, [adminId], (err, admin) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des informations de l\'administrateur.');
        }

        adminHTML = adminHTML.replace('{{userImage}}', admin.image || '/image/default.png'); // Image par défaut si aucune image

        res.send(adminHTML);
    });
});

app.get("/detail_recompense.html", (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login2.html');     }

    const userImage = req.session.userImage; 
    const adminHTML = fs.readFileSync(__dirname + "/html/detail_recompense.html", "utf-8");
    const updatedHTML = adminHTML.replace('{{userImage}}', userImage); // Remplacer l'image de l'utilisateur
    res.send(updatedHTML);
});

app.get('/mes_missions', (req, res) => {
    const administrateurId = req.session.administrateurId; 

    const sql = 'SELECT * FROM Missions WHERE administrateur_id = ?';
    
    db.all(sql, [administrateurId], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des missions.');
        }

       
        res.json(rows);
    });
});

app.get('/mission.html', (req, res) => {
    const adminId = req.session.administrateurId; 
    if (!adminId) {
        return res.redirect('/login1.html');     
    }

    const missionHTML = fs.readFileSync(__dirname + "/html/mission.html", "utf-8");
    
    const successMessage = req.session.successMessage;
    req.session.successMessage = null;

    const sqlAdmin = 'SELECT name, image FROM Admin_regist WHERE id = ?';
    db.get(sqlAdmin, [adminId], (err, admin) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des informations de l\'administrateur.');
        }

        let htmlWithMessage = missionHTML.replace("<!-- SUCCESS_MESSAGE -->", successMessage ? `<p>${successMessage}</p>` : '');
       
        htmlWithMessage = htmlWithMessage.replace('{{userImage}}', admin.image || '/image/default.png'); // Image par défaut si aucune image

        res.send(htmlWithMessage);
    });
});

app.get('/missions', (req, res) => {
    const sql = 'SELECT id, titre, description FROM Missions'; // Inclure l'ID
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des missions.');
        }
        res.json(rows);
    });
});

app.get("/calendrier.html", (req, res) => {
    const adminId = req.session.administrateurId; 
    if (!adminId) {
        return res.redirect('/login1.html'); 
    }

    const sql = 'SELECT name, image FROM Admin_regist WHERE id = ?';
    db.get(sql, [adminId], (err, admin) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des informations de l\'administrateur.');
        }

        let calendarHTML = fs.readFileSync(__dirname + "/html/calendrier.html", "utf-8");
        calendarHTML = calendarHTML.replace('{{userImage}}', admin.image || '/image/default.png'); // Remplacer l'image
        res.send(calendarHTML);
    });
});

app.get("/erreur.html", (req, res) => {
    const adminHTML = fs.readFileSync(__dirname + "/html/erreur.html", "utf-8");
    res.send(adminHTML);
});
app.get('/edit_mission.html', (req, res) => {
    const editMissionHTML = fs.readFileSync(__dirname + "/html/edit_mission.html", "utf-8");
    res.send(editMissionHTML);
});

app.get('/liste_mission.html', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login2.html'); // Rediriger si l'utilisateur n'est pas connecté
    }

    const userImage = req.session.userImage; 
    const listeMissionHTML = fs.readFileSync(__dirname + "/html/liste_mission.html", "utf-8");
    const updatedHTML = listeMissionHTML.replace('{{userImage}}', userImage); // Remplacer l'image de l'utilisateur
    res.send(updatedHTML);
});

app.get('/liste_recompense.html', (req, res) => {
    const adminId = req.session.administrateurId; 
    if (!adminId) {
        return res.redirect('/login1.html'); 
    }

    const listeMissionHTML = fs.readFileSync(__dirname + "/html/liste_recompense.html", "utf-8");

    const sqlAdmin = 'SELECT name, image FROM Admin_regist WHERE id = ?';
    db.get(sqlAdmin, [adminId], (err, admin) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des informations de l\'administrateur.');
        }

        const updatedHTML = listeMissionHTML.replace('{{userName}}', admin.name);
        const finalHTML = updatedHTML.replace('{{userImage}}', admin.image || '/image/default.png'); // Image par défaut si aucune image

        res.send(finalHTML);
    });
});

app.get('/historique_recompenses.html', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login2.html'); // Rediriger si l'utilisateur n'est pas connecté
    }

    const userImage = req.session.userImage; // Récupérer l'image de l'utilisateur

    const listeMissionHTML = fs.readFileSync(__dirname + "/html/historique_recompenses.html", "utf-8");
    const updatedHTML = listeMissionHTML.replace('{{userImage}}', userImage); // Remplacer l'image de l'utilisateur
    res.send(updatedHTML);
});

app.get('/mes_missions/:id', (req, res) => {
    const missionId = req.params.id;

    const sql = 'SELECT * FROM Missions WHERE id = ?';
    db.get(sql, [missionId], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération de la mission.');
        }
        if (!row) {
            return res.status(404).send('Mission non trouvée.');
        }
        res.json(row);
    });
});

app.get('/dashboard/missions/count', (req, res) => {
    const adminId = req.session.administrateurId; // Récupérer l'ID de l'administrateur depuis la session

    if (!adminId) {
        return res.status(403).json({ error: 'Non autorisé' }); // Si l'administrateur n'est pas connecté
    }

    const sql = 'SELECT COUNT(*) AS total FROM Missions WHERE administrateur_id = ?';
    
    db.get(sql, [adminId], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erreur lors de la récupération du nombre de missions.' });
        }
        res.json({ total: row.total }); 
    });
});

app.get('/dashboard/benevoles/count', (req, res) => {
    const sql = 'SELECT COUNT(*) AS total FROM User_regist';
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erreur lors de la récupération du nombre de bénévoles.' });
        }
        res.json({ total: row.total });
    });
});

app.get('/heure/recompenses/count', (req, res) => {
    const benevoleId = req.session.userId; 

    if (!benevoleId) {
        return res.status(403).json({ error: 'Non autorisé' }); 
    }

    const sql = `SELECT heure FROM Mission_benevole WHERE benevole_id = ?`;

    db.all(sql, [benevoleId], (err, rows) => {
        if (err) {
            console.error('Erreur SQL:', err); 
            return res.status(500).json({ error: 'Erreur lors de la récupération des heures.' });
        }

        let totalSeconds = 0;

        // Parcourir chaque heure et convertir en secondes
        rows.forEach(row => {
            const timeParts = row.heure.split(':'); // Séparer HH, MM, SS
            if (timeParts.length === 3) {
                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);
                const seconds = parseInt(timeParts[2], 10);
                totalSeconds += (hours * 3600) + (minutes * 60) + seconds; // Convertir en secondes
            }
        });

        const totalHours = formatTime(totalSeconds); // Formater le temps en HH:MM:SS
        res.json({ total_hours: totalHours }); 
    });
});

// Fonction pour formater le temps en HH:MM:SS
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600); // Total des heures
    const minutes = Math.floor((totalSeconds % 3600) / 60); // Total des minutes
    const seconds = totalSeconds % 60; // Total des secondes

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Fonction pour formater le temps en HH:MM:SS
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

app.get('/missions/count', (req, res) => {
    const sql = 'SELECT COUNT(*) AS total_missions FROM Missions';

    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Erreur SQL:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération du nombre de missions.' });
        }

        res.json({ total_missions: row.total_missions });
    });
});



app.get('/liste_missions', (req, res) => {
    const benevoleId = req.session.userId; 

    if (!benevoleId) {
        return res.status(403).send('Non autorisé'); 
    }

    const sqlSelect = `
        SELECT 
        MB.id,
        MB.heure,
        U.name AS benevole_name,
        M.titre AS mission_title,
        M.description AS mission_description
    FROM 
        Mission_benevole MB
    JOIN 
        User_regist U ON MB.benevole_id = U.id
    JOIN 
        Missions M ON MB.mission_id = M.id
    WHERE 
        MB.benevole_id = ?;  
    `;

    db.all(sqlSelect, [benevoleId], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des missions.');
        }

        res.status(200).json(rows);
    });
});

app.get('/liste_recompenses', (req, res) => {
    const sqlSelect = `
        SELECT 
        RB.id,
        RB.recompense,
        U.name AS benevole_name,
        M.titre AS mission_title
    FROM 
        Recompense_benevole RB
    JOIN 
        User_regist U ON RB.benevole_id = U.id
    JOIN 
        Missions M ON RB.mission_id = M.id;
    `;
    

    db.all(sqlSelect, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des récompenses de la mission.');
        }

        res.status(200).json(rows);
    });
});

app.get('/dashboard/recompenses', (req, res) => {
    const benevoleId = req.session.userId; 
    if (!benevoleId) {
        return res.status(403).json({ error: 'Non autorisé' }); // Si l'utilisateur n'est pas connecté
    }

    const sql = `
        SELECT 
            RB.id,
            RB.recompense,
            U.name AS benevole_name,
            M.titre AS mission_title
        FROM 
            Recompense_benevole RB
        JOIN 
            User_regist U ON RB.benevole_id = U.id
        JOIN 
            Missions M ON RB.mission_id = M.id
        WHERE 
            RB.benevole_id = ?`;

    db.all(sql, [benevoleId], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des récompenses.' });
        }
        res.json(rows);
    });
});

app.get('/api/missions', (req, res) => {
    const sql = 'SELECT titre, date_debut, date_fin FROM Missions';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la récupération des missions.');
        }
        res.json(rows);
    });
});

app.post('/register1', upload.single('image'), (req, res) => {
    const { name, mail, password } = req.body;
    const imagePath = req.file ? req.file.filename : null; 

    
    if (!name || !mail || !password || !imagePath) {
        return res.status(400).send('Tous les champs sont requis.');
    }

    
    const countQuery = 'SELECT COUNT(*) AS count FROM Admin_regist';
    db.get(countQuery, [], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la vérification des administrateurs.');
        }

        if (row.count >= 10) {
            return res.status(400).send('Le nombre maximum d\'administrateurs a été atteint.');
        }

        const sql = 'INSERT INTO Admin_regist (name, mail, password, image) VALUES (?, ?, ?, ?)';
        db.run(sql, [name, mail, password, imagePath], function(err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Erreur lors de l\'inscription.');
            }
            console.log(`Un enregistrement a été ajouté avec l'ID ${this.lastID}`);
            res.send(`
                <h1>Inscription réussie !</h1>
                <p>Vous pouvez maintenant vous connecter.</p>
                <a href="/login1.html">Aller à la page de connexion</a>
            `);
        });
    });
});

app.post('/login1', (req, res) => {
    const { mail, password } = req.body;

    db.get('SELECT id, name FROM Admin_regist WHERE mail = ? AND password = ?', [mail, password], (err, row) => {
        if (err) {
            console.error(err);
            return res.redirect('/erreur.html');
        }
        if (row) {
            req.session.administrateurId = row.id; 
            req.session.administrateurName = row.name;
            res.redirect('/dashboard.html');
        } else {
            res.redirect('/erreur.html'); 
        }
    });
});

app.get('/api/getAdminName', (req, res) => {
    if (req.session.administrateurName) {
        res.json({ name: req.session.administrateurName }); 
    } else {
        res.status(401).json({ error: 'Not authenticated' }); 
    }
});

app.post('/register2', upload.single('image'), (req, res) => {
    const { name, mail, password } = req.body;
    const imagePath = req.file ? req.file.filename : null; 

    if (!name || !mail || !password || !imagePath) {
        return res.status(400).send('Tous les champs sont requis.');
    }

    const countQuery = 'SELECT COUNT(*) AS count FROM User_regist';
    db.get(countQuery, [], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la vérification des bénévoles.');
        }

        if (row.count >= 10) {
            return res.status(400).send('Le nombre maximum de bénévoles a été atteint.');
        }

        const sql = 'INSERT INTO User_regist (name, mail, password, image) VALUES (?, ?, ?, ?)';
        db.run(sql, [name, mail, password, imagePath], function(err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Erreur lors de l\'inscription.');
            }
            console.log(`Un enregistrement a été ajouté avec l'ID ${this.lastID}`);
            res.send(`
                <h1>Inscription réussie !</h1>
                <p>Vous pouvez maintenant vous connecter.</p>
                <a href="/login2.html">Aller à la page de connexion</a>
            `);
        });
    });
});

app.post('/login2', (req, res) => {
    const { mail, password } = req.body;
    
    db.get('SELECT * FROM User_regist WHERE mail = ? AND password = ?', [mail, password], (err, row) => {
        if (err) {
            res.redirect('/erreur.html');
        }
        if (row) {
            req.session.userId = row.id;
            req.session.userName = row.name;
            req.session.userImage = row.image; 
            res.redirect('/dashboard_user.html');
        } else {
            res.redirect('/erreur.html');
        }
    });
});

app.get('/api/getUserName', (req, res) => {
    if (req.session.userName) {
        res.json({ name: req.session.userName }); 
    } else {
        res.status(401).json({ error: 'Not authenticated' }); 
    }
});

app.post('/mission', (req, res) => {
    const { titre, description, dateDeb, dateFin } = req.body;
    const administrateurId = req.session.administrateurId;

    if (!administrateurId) {
        return res.status(403).send('Vous devez être connecté pour ajouter une mission.');
    }

    const sql = 'INSERT INTO Missions (titre, description, date_debut, date_fin, administrateur_id) VALUES (?, ?, ?, ?, ?)';

    db.run(sql, [titre, description, dateDeb, dateFin, administrateurId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de l\'ajout de la mission.');
        }
        console.log(`Une nouvelle mission a été ajoutée avec l'ID ${this.lastID}`);
        
        res.redirect('/mission.html?message=Mission%20enregistrée%20avec%20succès%20!');
    });
});

app.post('/updateProfileImage', upload.single('image'), (req, res) => {
    const userId = req.session.userId; 
    const imagePath = req.file ? req.file.filename : null; 

    if (!userId || !imagePath) {
        return res.status(400).send('Tous les champs sont requis.');
    }

    const sql = 'UPDATE User_regist SET image = ? WHERE id = ?';
    db.run(sql, [imagePath, userId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la mise à jour de l\'image.');
        }
        console.log(`Image de profil mise à jour pour l'utilisateur avec l'ID ${userId}`);
        
        req.session.userImage = imagePath;

        res.redirect('/dashboard_user.html'); 
    });
});

app.post('/updateAdminProfileImage', upload.single('image'), (req, res) => {
    const adminId = req.session.administrateurId; 
    const imagePath = req.file ? req.file.filename : null; 

    if (!adminId || !imagePath) {
        return res.status(400).send('Tous les champs sont requis.');
    }

    const sql = 'UPDATE Admin_regist SET image = ? WHERE id = ?';
    db.run(sql, [imagePath, adminId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la mise à jour de l\'image.');
        }

        req.session.userImage = imagePath;

        res.redirect('/dashboard.html'); 
    });
});

app.delete('/delete_mission/:id', (req, res) => {
    const missionId = req.params.id;

    const sql = 'DELETE FROM Missions WHERE id = ?';
    db.run(sql, [missionId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erreur lors de la suppression de la mission.');
        }
        console.log(`Mission avec l'ID ${missionId} supprimée`);
        res.status(204).send(); 
    });
});

app.delete('/mission_benevole/:id', (req, res) => {
    const missionId = req.params.id;

    const sqlDelete = 'DELETE FROM Mission_benevole WHERE id = ?';
    db.run(sqlDelete, [missionId], function(error) {
        if (error) {
            console.error('Erreur lors de la suppression:', error);
            return res.status(500).send('Erreur lors de la suppression de la mission.');
        }
        console.log(`Mission avec l'ID ${missionId} supprimée`);
        res.status(204).send(); 
    });
});

app.delete('/send_recompense/:id', (req, res) => {
    const missionId = req.params.id;

    const sqlDelete = 'DELETE FROM Recompense_benevole WHERE id = ?';
    db.run(sqlDelete, [missionId], function(error) {
        if (error) {
            console.error('Erreur lors de la suppression:', error);
            return res.status(500).send('Erreur lors de la suppression de la mission.');
        }
        console.log(`Recompense avec l'ID ${missionId} supprimée`);
        res.status(204).send(); 
    });
});

app.put('/edit_mission/:id', (req, res) => {
    const missionId = req.params.id;
    console.log(req.body)
    const { titre, description, dateDeb, dateFin } = req.body;
    const administrateurId = req.session.administrateurId; 

    // Log des données reçues
    console.log('Données reçues pour la mise à jour :');
    console.log('ID de la mission :', missionId);
    console.log('Titre :', titre);
    console.log('Description :', description);
    console.log('Date de début :', dateDeb);
    console.log('Date de fin :', dateFin);
    console.log('ID de l\'administrateur :', administrateurId);

    if (!titre || !description || !dateDeb || !dateFin) {
        return res.status(400).send('Tous les champs sont requis.');
    }

    const sqlUpdate = `
        UPDATE Missions 
        SET titre = ?, description = ?, date_debut = ?, date_fin = ?, administrateur_id = ? 
        WHERE id = ?`;
    
    const valuesUpdate = [titre, description, dateDeb, dateFin, administrateurId, missionId];

    // Log des valeurs qui vont être mises à jour
    console.log('Valeurs à mettre à jour :', valuesUpdate);

    db.run(sqlUpdate, valuesUpdate, function(err) {
        if (err) {
            console.error('Erreur lors de la mise à jour:', err);
            return res.status(500).send('Erreur lors de la mise à jour de la mission.');
        }

        res.status(200).send('Mission mise à jour avec succès !');
    });
});

app.post('/mission_benevole', (req, res) => {
    const { mission_id, heure, benevole_id } = req.body; 

    console.log('Données reçues:', req.body);

    if (!mission_id || !heure || !benevole_id) {
        return res.status(400).send('Tous les champs sont requis.');
    }

    const sqlInsert = 'INSERT INTO Mission_benevole (mission_id, benevole_id, heure) VALUES (?, ?, ?)';
    const valuesInsert = [mission_id, benevole_id, heure];

    db.run(sqlInsert, valuesInsert, function(error) {
        if (error) {
            console.error('Erreur lors de l\'insertion:', error);
            return res.status(500).send('Erreur lors de l\'insertion des données.');
        }

        // Récupérer les détails de la mission après l'insertion
        const sqlSelect = 'SELECT titre, description FROM Missions WHERE id = ?';
        db.get(sqlSelect, [mission_id], (err, mission) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Erreur lors de la récupération des détails de la mission.');
            }

            // Optionnel : Vous pouvez envoyer une réponse avec les détails de la mission
            res.redirect('/mission_benevole.html?message=Mission%20enregistrée%20avec%20succès%20!');
        });
    });
});

app.post('/send_recompense', (req, res) => {
    const { mission_id, recompense, benevole_id } = req.body; 

    console.log('Données reçues:', req.body);

    if (!mission_id || !recompense || !benevole_id) {
        return res.status(400).send('Tous les champs sont requis.');
    }

    const sqlInsert = 'INSERT INTO Recompense_benevole (mission_id,benevole_id, recompense) VALUES (?, ?, ?)';
    const valuesInsert = [mission_id,benevole_id, recompense];

    db.run(sqlInsert, valuesInsert, function(error) {
        if (error) {
            console.error('Erreur lors de l\'insertion:', error);
            return res.status(500).send('Erreur lors de l\'insertion des données.');
        }

        const sqlSelect = 'SELECT titre FROM Missions WHERE id = ?';
        db.get(sqlSelect, [mission_id], (err, mission) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Erreur lors de la récupération des détails de la mission.');
            }
        });
        res.redirect('/send_recompense.html?message=Mission%20enregistrée%20avec%20succès%20!');
    });
});


app.get("/*", (req, res) => {
    const HTML = fs.readFileSync(__dirname + "/html/404.html", "utf8");
    res.send(HTML);
});


app.listen(PORT, () => {
    console.log("Le serveur est lancé alors GO !!! http://localhost:8080/");
});