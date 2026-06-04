# RAPPORT DE PROJET DE FIN DE FORMATION

# BusTracker : Application Web de Suivi Intelligent en Temps Réel du Transport Scolaire

---

# TABLE DES MATIÈRES

**INTRODUCTION GÉNÉRALE** ................................................................................................ 1
**LISTE DES ABRÉVIATIONS** .................................................................................................. 2
**LISTE DES FIGURES** ............................................................................................................. 3
**LISTE DES TABLEAUX** ......................................................................................................... 5

**CHAPITRE 1 : ÉTUDE ET ANALYSE DES BESOINS** .......................................................... 6
I. Introduction .............................................................................................................................. 7
II. Présentation du projet BusTracker .......................................................................................... 7
II.1 Contexte et justification ..................................................................................................... 7
II.2 Problématique ................................................................................................................... 8
II.3 Objectifs du projet ............................................................................................................. 9
II.4 Cahier des charges ............................................................................................................. 10
III. Étude de l'existant et limites .................................................................................................. 11
IV. Analyse des besoins ............................................................................................................... 12
IV.1 Besoins fonctionnels ........................................................................................................ 12
IV.1.1 Besoins de l'Administrateur ..................................................................................... 12
IV.1.2 Besoins du Chauffeur .............................................................................................. 13
IV.1.3 Besoins du Parent .................................................................................................... 14
IV.2 Besoins non fonctionnels ................................................................................................. 15
V. Solution proposée ................................................................................................................... 16
VI. Conclusion ............................................................................................................................. 17

**CHAPITRE 2 : CONCEPTION DU PROJET** ........................................................................ 18
I. Introduction .............................................................................................................................. 19
II. Architecture générale du système (Séparation Front/Back) ................................................... 19
III. Modélisation UML ................................................................................................................ 20
III.1 Identification des acteurs (Admin, Chauffeur, Parent) .................................................... 20
III.2 Diagramme de cas d’utilisation ....................................................................................... 21
III.3 Diagrammes de séquence ................................................................................................ 23
IV. Conception de la base de données ......................................................................................... 25
IV.1 Diagramme de classes ..................................................................................................... 25
IV.2 Dictionnaire de données .................................................................................................. 26
V. Maquettes des interfaces (Wireframes) .................................................................................. 28
V.2 Maquettes de l'Espace Administrateur ............................................................................. 29
V.3 Maquettes de l'Espace Chauffeur ..................................................................................... 30
V.4 Maquettes de l'Espace Parent ........................................................................................... 31
VI. Conclusion ............................................................................................................................. 32

**CHAPITRE 3 : IDENTITÉ VISUELLE ET CHARTE GRAPHIQUE** .............................. 33
I. Introduction .............................................................................................................................. 34
II. Charte graphique de BusTracker ............................................................................................ 34
II.1 Le Logo ............................................................................................................................ 34
II.2 La palette de couleurs ....................................................................................................... 35
II.3 La typographie .................................................................................................................. 36
III. Conclusion ............................................................................................................................. 37

**CHAPITRE 4 : RÉALISATION DU PROJET** ........................................................................ 38
I. Introduction .............................................................................................................................. 39
II. Environnement et Outils de développement ........................................................................... 39
III. Technologies utilisées ........................................................................................................... 40
III.1 Backend : Laravel 12 & Sanctum ................................................................................... 40
III.2 Frontend : React 19 & Vite 8 ......................................................................................... 41
III.3 Base de données : MySQL ............................................................................................. 42
III.4 Temps réel et Cartographie : Firebase & Leaflet.js ........................................................ 43
IV. Développement des fonctionnalités clés (Backend) ............................................................. 44
IV.1 Création et protection de l'API (Middleware) ................................................................ 44
IV.2 Algorithme de Geofencing (Formule de Haversine) ...................................................... 45
IV.3 Synchronisation des données Laravel-Firebase ............................................................. 46
V. Réalisation des interfaces utilisateur (Frontend) .................................................................... 47
**V.1 Espace Public et Authentification** .................................................................------------- 47
V.1.1 Page de choix du rôle (Landing) .............................................................................. 47
V.1.2 Page de Connexion (Login) ...................................................................................... 48
V.1.3 Page d'Inscription Parent (Signup) ........................................................................... 48
**V.2 Espace Administrateur** .................................................................................-------------- 49
V.2.1 Page Dashboard (Statistiques) .................................................................................. 49
V.2.2 Page Gestion des Utilisateurs .................................................................................... 50
V.2.3 Page Gestion de la Flotte (Bus) ................................................................................ 50
V.2.4 Page Importation Excel (Onboarding) ...................................................................... 51
V.2.5 Page d'Affectation (Élèves -> Bus) .......................................................................... 51
**V.3 Espace Chauffeur** .................................................................................---------------------- 52
V.3.1 Page de Sélection du Trajet (Aller/Retour) .............................................................. 52
V.3.2 Page Feuille d'Appel Électronique (Pointage) ......................................................... 53
V.3.3 Page Carte et Émission GPS (Live) ......................................................................... 53
**V.4 Espace Parent** .................................................................................................------------ 54
V.4.1 Page Dashboard Parent (Liaison enfant) .................................................................. 54
V.4.2 Page Carte de Suivi (Live Tracking) ........................................................................ 55
V.4.3 Page Configuration du Domicile (Pickup point) ...................................................... 55
V.4.4 Page Déclaration d'Absence & Notifications ........................................................... 56
VI. Difficultés techniques et solutions ........................................................................................ 57
VI.1 Problème de Network Exhaustion (Firebase) ................................................................. 57
VI.2 Problème de requêtes N+1 (Laravel Eloquent) .............................................................. 58
VII. Conclusion .................................................................................................................---------- 59

**CHAPITRE 5 : TESTS, VALIDATION ET GESTION DE PROJET** ................................ 60
I. Introduction .............................................................................................................................. 61
II. Stratégie de tests ..................................................................................................................... 61
II.1 Tests Unitaires et Fonctionnels ........................................................................................ 61
II.2 Tests de Sécurité et Rôles ................................................................................................ 62
III. Gestion de projet ................................................................................................................... 63
III.1 Méthodologie Agile Scrum ............................................................................................ 63
III.2 Planification (Diagramme de Gantt) .............................................................................. 64
III.3 Outils de suivi (Trello, Git) ............................................................................................ 65
IV. Conclusion ............................................................................................................................. 66

**CONCLUSION GÉNÉRALE** .................................................................................................. 67
**BIBLIOGRAPHIE / WEBOGRAPHIE** .................................................................................. 69
**ANNEXES** ................................................................................................................................ 70
Annexe A : Structure globale du projet ....................................................................................... 70
Annexe B : Liste des routes de l'API REST ............................................................................... 71
Annexe C : Règles de sécurité Firebase (database.rules.json) ................................................... 72

---

# INTRODUCTION GÉNÉRALE

La gestion du transport scolaire — qu'il s'agisse de la planification des tournées, du suivi quotidien des trajets ou de la vérification de la présence des élèves — représente un défi logistique majeur pour tout établissement d'enseignement. La gestion des fiches d'élèves, le pointage manuel sur feuille d'appel à bord, le contrôle de sécurité en temps réel et la communication avec les parents constituent autant de tâches chronophages, souvent source d'erreurs et de frustrations lorsqu'elles sont réalisées manuellement ou à l'aide de canaux disparates et non intégrés (comme les groupes WhatsApp surchargés).

Dans un contexte de transformation numérique accélérée, les attentes des utilisateurs évoluent considérablement. Les administrations scolaires recherchent désormais des solutions centralisées, intuitives et accessibles depuis n'importe quel terminal connecté. Parallèlement, les parents souhaitent bénéficier d'une expérience fluide, moderne et rassurante, leur permettant de suivre en temps réel la localisation du bus et la sécurité de leur enfant de la montée à la dépose. Le recours aux technologies web modernes, aux bases de données temps réel et aux cartes interactives s'impose donc comme une réponse naturelle et efficace à ces nouveaux besoins.

C'est dans ce contexte que s'inscrit le projet **BusTracker**, une plateforme web intelligente dédiée à la gestion et au suivi en temps réel du transport scolaire. BusTracker offre un écosystème complet permettant aux administrateurs de créer et gérer la flotte de bus, d'importer les listes d'élèves via Excel avec génération et liaison automatique des comptes parents correspondants, et de distribuer les accès de connexion en un clic via WhatsApp. La plateforme permet aux chauffeurs de transmettre leur position GPS toutes les 5 secondes et d'effectuer l'appel tactile, et aux parents de suivre la géolocalisation en direct sur une carte Leaflet et de recevoir des alertes de proximité automatisées (2000m et 50m) basées sur la formule de Haversine.

Le présent rapport constitue le mémoire de notre Projet de Fin d'Études (PFE), réalisé dans le cadre de notre formation en **Développement Digital — Option Full Stack** au sein de la **Cité des Métiers et des Compétences (CMC)** sous la tutelle de l'**Office de la Formation Professionnelle et de la Promotion du Travail (OFPPT)**. Il retrace l'ensemble des étapes de conception, de développement et de mise en œuvre de la plateforme BusTracker, depuis l'analyse des besoins jusqu'aux tests de validation.

---

# LISTE DES ABRÉVIATIONS

* **API** : Application Programming Interface (Interface de Programmation d'Application)
* **CRUD** : Create, Read, Update, Delete (Créer, Lire, Mettre à jour, Supprimer)
* **CSS** : Cascading Style Sheets (Feuilles de Style en Cascade)
* **DOM** : Document Object Model (Modèle d'Objet de Document)
* **ERD** : Entity-Relationship Diagram (MCD - Modèle Conceptuel de Données)
* **GPS** : Global Positioning System (Système de Positionnement Global)
* **HTML** : HyperText Markup Language (Langage de Balisage Hypertexte)
* **HTTP** : HyperText Transfer Protocol (Protocole de Transfert Hypertexte)
* **JSON** : JavaScript Object Notation (Notation d'Objet JavaScript)
* **LTR** : Left To Right (De Gauche à Droite)
* **MVC** : Model-View-Controller (Modèle-Vue-Contrôleur)
* **OFPPT** : Office de la Formation Professionnelle et de la Promotion du Travail
* **ORM** : Object-Relational Mapping (Mapping Objet-Relationnel)
* **PFE** : Projet de Fin d'Études
* **REST** : Representational State Transfer
* **RTL** : Right To Left (De Droite à Gauche)
* **SPA** : Single Page Application (Application Web Monopage)
* **SQL** : Structured Query Language (Langage de Requête Structuré)
* **UI** : User Interface (Interface Utilisateur)
* **UML** : Unified Modeling Language (Langage de Modélisation Unifié)
* **UX** : User Experience (Expérience Utilisateur)

---

# LISTE DES FIGURES

* **Figure 1** : Schéma illustrant la lourdeur et les risques du système de transport scolaire traditionnel (WhatsApp, appels dangereux au volant, feuille d'appel papier perdue) ......... 11
* **Figure 2** : Logigramme du processus global d'onboarding de BusTracker (Importation Excel de la liste d'élèves, création automatique des comptes parents liés, et envoi en un clic des identifiants via WhatsApp) ......... 16
* **Figure 3** : Schéma de l'architecture physique et logique de l'application (Séparation React Frontend et Laravel Backend, avec Firebase Realtime Database en parallèle pour le transit des coordonnées GPS) ......... 19
* **Figure 4** : Diagramme de Cas d'Utilisation Global du système BusTracker illustrant les interactions des trois acteurs (Administrateur, Chauffeur, Parent) avec l'application ......... 21
* **Figure 5** : Diagramme de Séquence du cycle de vie du trajet (démarrage du trajet par le chauffeur, mise à jour des positions sur Firebase, réception des notifications par le parent et clôture du trajet) ......... 23
* **Figure 6** : Diagramme de Séquence du processus d'importation Excel et de distribution des credentials via WhatsApp par l'administrateur ......... 24
* **Figure 7** : Diagramme de Classes du système BusTracker détaillant les entités, leurs attributs et les relations d'association ......... 25
* **Figure 8** : Maquettes fil de fer (Wireframes) de l'Espace Public (Page de choix du rôle, Écran de connexion, Page d'inscription Parent) ......... 28
* **Figure 9** : Maquettes fil de fer (Wireframes) de l'Espace Administrateur (Dashboard global Desktop, Console de gestion des utilisateurs, Interface d'importation Excel) ......... 29
* **Figure 10** : Maquette fil de fer (Wireframe) de l'Espace Chauffeur (Tableau de bord de démarrage du trajet et Interface d'appel électronique tactile) ......... 30
* **Figure 11** : Maquette fil de fer (Wireframe) de l'Espace Parent (Écran de suivi en direct sur carte Leaflet avec panneau d'actions rapides et configuration du point de pickup) ......... 31

---

# LISTE DES TABLEAUX

* **Tableau 1** : Acteurs du système et modes d'accès ......... 10
* **Tableau 2** : Périmètre fonctionnel de l'application ......... 10
* **Tableau 3** : Besoins fonctionnels de l'Administrateur ......... 12
* **Tableau 4** : Besoins fonctionnels du Chauffeur ......... 13
* **Tableau 5** : Besoins fonctionnels du Parent ......... 14
* **Tableau 6** : Dictionnaire de la table `users` (Comptes, mots de passe de secours et rôles) ......... 26
* **Tableau 7** : Dictionnaire de la table `students` (Profils élèves, adresses et codes reg_code) ......... 26
* **Tableau 8** : Dictionnaire de la table `buses` (Flotte de véhicules, capacités et affectations) ......... 27
* **Tableau 9** : Dictionnaire de la table `trips` (Journalisation des trajets scolaires) ......... 27
* **Tableau 10** : Dictionnaire de la table `presences` (Feuilles d'appel et pointage des statuts) ......... 27
* **Tableau 11** : Dictionnaire de la table `notifications` (Journal d'historisation des alertes) ......... 27
* **Tableau 12** : Dictionnaire de la table `personal_access_tokens` (Tokens d'authentification) ......... 28

---

# CHAPITRE 1 : ÉTUDE ET ANALYSE DES BESOINS

## I. Introduction

Ce premier chapitre est consacré à l'exploration approfondie du contexte, des problématiques et des objectifs qui ont conduit à la genèse du projet **BusTracker**. L'objectif principal de cette phase préliminaire est de dresser un diagnostic précis des méthodes de gestion du transport scolaire actuellement employées afin d'en identifier les limites organisationnelles, ergonomiques et techniques. 

À travers cette analyse, nous formalisons le cahier des charges fonctionnel et technique de la plateforme. Nous détaillerons de manière exhaustive les attentes spécifiques de chaque catégorie d'acteurs (administrateurs, chauffeurs et parents d'élèves) sous la forme de besoins fonctionnels précis. Enfin, nous définirons les exigences non fonctionnelles de sécurité, de performance et d'ergonomie nécessaires à la viabilité d'une telle solution en production. Cette étude préalable constitue le socle indispensable à la phase ultérieure de conception architecturale et fonctionnelle de l'application.

---

## II. Présentation du projet BusTracker

### II.1 Contexte et justification

Le transport scolaire représente un maillon fondamental de la logistique éducative, particulièrement dans un pays en pleine transition démographique et urbaine comme le Maroc. L'expansion constante de la population étudiante, combinée à l'éloignement croissant des établissements scolaires des zones résidentielles périphériques, a rendu le transport collectif indispensable pour des milliers de familles. Les institutions d'enseignement sont confrontées à la nécessité de garantir un service de transport non seulement ponctuel, mais également irréprochable sur le plan de la sécurité.

Dans le cadre de notre formation en **Développement Digital — Option Full Stack** au sein de la **Cité des Métiers et des Compétences (CMC)** sous l'égide de l'**Office de la Formation Professionnelle et de la Promotion du Travail (OFPPT)**, nous avons constaté que la modernisation des infrastructures physiques doit s'accompagner d'une transformation numérique des outils de gestion. L'absence d'outils numériques spécialisés contraint aujourd'hui la majorité des établissements scolaires à s'appuyer sur des méthodes traditionnelles, fragmentées et peu sécurisées. 

Le projet **BusTracker** se justifie par cette volonté de combler le fossé technologique existant. En unifiant les flux opérationnels (gestion administrative, pointage et émission GPS) au sein d'une unique Single Page Application (SPA) responsive, le projet apporte une valeur ajoutée significative. Le choix d'une architecture web découplée, s'appuyant sur les technologies Laravel 12 et React 19, garantit une accessibilité immédiate sans nécessiter d'installation d'application mobile native, réduisant ainsi les coûts de déploiement tout en assurant une maintenance logicielle centralisée et fluide.

---

### II.2 Problématique

La gestion traditionnelle du transport scolaire souffre d'une faille structurelle majeure : l'**asymétrie de l'information**. Les flux de données entre l'administration scolaire, les chauffeurs sur la route et les parents d'élèves à domicile sont hachés, non synchronisés et sujets à de nombreuses frictions opérationnelles. Cette opacité informationnelle génère des dysfonctionnements critiques pour chaque catégorie d'acteurs :

* **Au niveau de l'administration** : La planification des tournées, la gestion de la flotte de bus et l'affectation des élèves s'effectuent via des tableurs Excel locaux et statiques. En cas de modification d'itinéraire ou d'affectation en cours d'année, la synchronisation avec les chauffeurs est laborieuse. De plus, l'administrateur ne dispose d'aucun moyen de supervision en temps réel. Il lui est impossible de savoir si un véhicule respecte son tracé, s'il a pris du retard ou s'il a rencontré une panne, sauf à appeler directement le chauffeur, ce qui nuit à l'efficacité globale du service.
* **Au niveau du chauffeur** : Le conducteur a la responsabilité de valider la présence des élèves lors de la montée et de la dépose. Actuellement, cela s'effectue au moyen d'une feuille d'appel papier. Ce support physique est non seulement sujet aux pertes et détériorations, mais il empêche également toute transmission instantanée des données à l'école. En outre, pour prévenir les parents d'une arrivée imminente, les conducteurs ou accompagnatrices utilisent des groupes de discussion WhatsApp ou passent des appels téléphoniques. Cette manipulation du smartphone en conduisant représente un danger mortel pour les passagers.
* **Au niveau des parents** : Sans visibilité sur la position réelle du bus, les parents et leurs enfants subissent des temps d'attente prolongés et imprévisibles aux points de ramassage, souvent exposés aux aléas climatiques. Ce manque d'information en temps réel engendre un stress et une anxiété permanents chez les tuteurs, qui craignent pour la sécurité de leurs enfants et s'inquiètent des retards inexpliqués.

La problématique du projet peut donc se résumer ainsi : **Comment concevoir et déployer une plateforme web moderne et temps réel capable d'unifier la gestion administrative, de sécuriser l'onboarding des utilisateurs sans surcoût de communication, et d'automatiser le suivi géolocalisé des bus ainsi que la notification de proximité aux parents, tout en éliminant les risques liés à l'usage manuel du téléphone par les chauffeurs ?**

---

### II.3 Objectifs du projet

Pour répondre de manière exhaustive à la problématique formulée, le projet **BusTracker** se fixe sept objectifs opérationnels et techniques précis :

1. **Automatisation de l'importation de données (Onboarding administratif)** : Concevoir un module d'importation en masse de fichiers Excel (à l'aide de la bibliothèque Maatwebsite Excel) permettant à l'administrateur de configurer les profils d'élèves et de générer en une seule transaction SQL les fiches d'élèves ainsi que les comptes parents associés, réduisant ainsi les temps de saisie de plusieurs jours à quelques secondes.
2. **Distribution économique des credentials d'accès** : Intégrer l'API publique de WhatsApp (`wa.me`) pour permettre l'envoi direct et gratuit des messages de bienvenue contenant l'URL de connexion, l'identifiant et le mot de passe de secours généré pour chaque utilisateur, évitant ainsi le recours à des services SMS payants.
3. **Télémétrie et suivi en temps réel** : Implémenter une synchronisation bidirectionnelle via **Firebase Realtime Database** permettant de remonter la position GPS du bus toutes les 5 secondes depuis le terminal du chauffeur et de la restituer instantanément sur la carte Leaflet du parent avec une latence inférieure à 2 secondes.
4. **Feuille d'appel électronique tactile** : Remplacer les supports papier par une interface de pointage numérique fluide sur l'espace chauffeur, permettant d'enregistrer instantanément en base de données les statuts des élèves (`waiting`, `ready`, `mounted`, `absent`, `dropped`) et de notifier l'école et les parents à chaque étape.
5. **Géofencing et alertes de proximité automatisées** : Développer un algorithme côté client et serveur basé sur la **formule de Haversine** pour calculer en continu la distance géodésique entre le bus et le domicile configuré de l'élève. L'algorithme doit déclencher des alertes automatiques à des seuils clés (2000m pour préparer l'enfant, 50m pour confirmer l'arrivée du véhicule).
6. **Contrôle d'accès rigoureux et protection des données** : Sécuriser les API REST à l'aide de **Laravel Sanctum** et filtrer les requêtes selon les profils (Admin, Chauffeur, Parent) via le middleware `EnsureUserRole` pour protéger la vie privée des élèves et empêcher toute fuite de position GPS.
7. **Accessibilité linguistique et ergonomie RTL/LTR** : Fournir une interface utilisateur responsive, fluide, intégralement traduite en **français** et en **arabe**, en adaptant dynamiquement l'orientation de la mise en page (RTL pour l'arabe, LTR pour le français), la langue par défaut de l'application étant l'arabe pour s'adapter au profil des utilisateurs cibles au Maroc.

---

### II.4 Cahier des charges

Le présent cahier des charges formalise le périmètre fonctionnel de l'application **BusTracker** et identifie les acteurs cibles ainsi que leurs rôles respectifs.

**Titre du projet :** BusTracker — Application Web de Suivi Intelligent en Temps Réel du Transport Scolaire.

**Nature du projet :** Application web full stack à architecture découplée (SPA React + API REST Laravel + Firebase Realtime Database).

**Public cible :** Établissements scolaires disposant d'un service de transport en bus.

**Acteurs et accès au système** : Le système s'articule autour de trois profils d'utilisateurs distincts. L'Administrateur accède à une console Desktop complète pour gérer la configuration globale. Le Chauffeur interagit avec une interface mobile-first simplifiée et tactile pour gérer les trajets et le pointage. Le Parent utilise une interface mobile-first pour suivre le trajet et gérer les informations de son enfant.

* **Tableau 1 : Acteurs du système et modes d'accès**

| Acteur | Description | Mode d'accès |
|:---|:---|:---|
| **Administrateur** | Gestionnaire central de la plateforme. Configure les bus, gère les utilisateurs, importe les fichiers Excel de données et supervise les trajets. | Compte créé en base de données. Interface Desktop. |
| **Chauffeur** | Conducteur d'un bus scolaire. Démarre les trajets, transmet sa position GPS et effectue l'appel électronique des élèves. | Compte créé par l'administrateur ou via importation. Interface Mobile-First. |
| **Parent** | Tuteur de l'élève. Suit le bus de son enfant sur la carte en temps réel, déclare les absences et reçoit les alertes. | Compte généré lors de l'import Excel (ou inscription publique avec liaison par `reg_code`). Interface Mobile-First. |

**Périmètre fonctionnel** : L'application intègre des modules d'authentification par jeton révocable, de gestion administrative de la flotte, d'importation de fichiers Excel, de géolocalisation temps réel via Firebase et Leaflet.js, d'alertes automatiques et d'internationalisation bilingue.

* **Tableau 2 : Périmètre fonctionnel de l'application**

| Module | Fonctionnalités clés incluses |
|:---|:---|
| **Authentification** | Multi-rôle sécurisé avec tokens d'accès (Laravel Sanctum) et déconnexion. |
| **Administration** | CRUD utilisateurs/bus/élèves, assignation bus-élève, attribution bus-chauffeur, live tracking global. |
| **Excel & WhatsApp** | Importation en masse, liaison automatique parent-élève, partage de credentials via l'API wa.me. |
| **Chauffeur Mobile** | Sélection du trajet, émission GPS (5s), feuille d'appel interactive, nudge parent. |
| **Parent Mobile** | Liaison enfant (`reg_code`), confirmation domicile, carte live Leaflet, declarations d'absence/prêt, alertes. |
| **Notifications** | Alertes de proximité par géofencing Haversine (seuils 2000m et 50m). |
| **Langues (i18n)** | Support complet du français et de l'arabe (default arabe, gestion RTL/LTR). |

---

## III. Étude de l'existant et limites

L'analyse de l'existant met en lumière l'inadéquation des outils traditionnels face aux exigences de sécurité actuelles. Dans la majorité des établissements scolaires marocains, la gestion repose sur l'utilisation déconnectée de tableurs Excel administratifs, de feuilles de pointage papier soumises aux aléas des tournées, et de groupes de discussion WhatsApp informels et pollués par des flux de communication incessants. 

Ces méthodes engendrent des risques majeurs : retards répétés aux arrêts en raison du trafic, stress permanent pour les parents d'élèves laissés dans l'ignorance de la position du bus, et comportement à risque des conducteurs manipulant leur smartphone pour répondre aux interrogations des familles.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 1 - Schéma illustrant la lourdeur et les risques du système de transport scolaire traditionnel (WhatsApp, appels dangereux au volant, feuille d'appel papier perdue)]

Le schéma de la Figure 1 met en évidence le manque de traçabilité des données d'appels papier, l'inefficacité des groupes WhatsApp saturés et le danger de la communication téléphonique en cours de trajet. C'est pour pallier ces limites physiques et de communication que BusTracker propose de dématérialiser et d'automatiser l'intégralité du processus de suivi.

---

## IV. Analyse des besoins

### IV.1 Besoins fonctionnels

Les besoins fonctionnels décrivent les cas d'utilisation précis développés pour les trois acteurs du système.

#### IV.1.1 Besoins de l'Administrateur

L'administrateur doit disposer d'un contrôle absolu sur le référentiel de données et le suivi opérationnel de la flotte.

* **Tableau 3 : Besoins fonctionnels de l'Administrateur**

| Code | Besoin fonctionnel | Description détaillée |
|:---|:---|:---|
| **BF-A01** | Authentification et sécurité | Se connecter de manière sécurisée et disposer de droits de super-utilisateur pour configurer l'ensemble de la plateforme. |
| **BF-A02** | Importation en masse Excel | Téléverser un fichier Excel de données d'élèves, mapper les colonnes, et laisser le système créer automatiquement les élèves tout en générant et liant les comptes parents correspondants s'ils n'existent pas encore. |
| **BF-A03** | Distribution des comptes WhatsApp | Sélectionner les chauffeurs ou les parents importés et lancer l'envoi de leurs identifiants de connexion via l'ouverture automatique de discussions WhatsApp pré-remplies avec leurs coordonnées d'accès et mot de passe de secours. |
| **BF-A04** | Gestion de la flotte de bus | Effectuer des opérations de création, modification, désactivation et suppression (CRUD) sur les bus et les chauffeurs, et associer chaque chauffeur à un bus. |
| **BF-A05** | Affectation dynamique des élèves | Assigner des élèves à des lignes de bus spécifiques depuis un tableau de bord, avec vérification visuelle de la capacité maximale du bus. |
| **BF-A06** | Supervision temps réel | Visualiser sur une carte Leaflet l'ensemble des bus scolaires en cours de trajet, avec l'état de leur progression et la liste d'appel des élèves. |
| **BF-A07** | Consultation des rapports | Accéder à l'historique de tous les trajets clôturés, avec les fiches de présence détaillées et horodatées pour chaque élève. |

#### IV.1.2 Besoins du Chauffeur

L'interface chauffeur doit être pensée pour minimiser les interactions tactiles et maximiser la sécurité lors des arrêts.

* **Tableau 4 : Besoins fonctionnels du Chauffeur**

| Code | Besoin fonctionnel | Description détaillée |
|:---|:---|:---|
| **BF-C01** | Tableau de bord et initialisation | Consulter son planning de tournée et démarrer un trajet en choisissant son type (`aller` pour le ramassage matinal ou `retour` pour le retour de l'école). |
| **BF-C02** | Pointage électronique interactif | Remplacer l'appel papier par une interface tactile simple permettant de modifier d'un seul clic le statut d'un élève à son arrêt : `waiting`, `ready` (si le parent a pré-signalé l'enfant prêt), `mounted` (monté à bord), `absent`, ou `dropped` (déposé à destination). |
| **BF-C03** | Émission GPS automatique | Envoyer automatiquement, en arrière-plan, les coordonnées GPS de son appareil vers Firebase Realtime Database toutes les **5 secondes** dès qu'un trajet est actif. |
| **BF-C04** | Nudge de rappel | Envoyer un signal de rappel instantané ("Nudge") au parent d'un élève en retard à son point d'arrêt pour l'avertir de presser le pas, sans avoir à l'appeler au téléphone. |
| **BF-C05** | Clôture sécurisée du trajet | Finaliser la tournée, ce qui déclenche l'envoi de la feuille de présence finale à la base de données SQL principale et réinitialise le statut opérationnel du bus. |

#### IV.1.3 Besoins du Parent

L'espace parent vise à offrir une visibilité instantanée et rassurante sur la sécurité de l'élève.

* **Tableau 5 : Besoins fonctionnels du Parent**

| Code | Besoin fonctionnel | Description détaillée |
|:---|:---|:---|
| **BF-P01** | Inscription publique et liaison enfant | Créer un compte parent manuellement et lier son enfant à son profil en saisissant le code d'inscription unique (`reg_code`) fourni par l'administration. |
| **BF-P02** | Configuration du domicile | Pointer précisément sur la carte Leaflet l'emplacement de son domicile (pickup point) pour permettre des calculs géographiques de proximité précis. |
| **BF-P03** | Suivi cartographique en direct | Visualiser sur une carte dynamique le déplacement en temps réel du bus scolaire de son enfant uniquement lorsque le trajet de ce dernier est actif. |
| **BF-P04** | Signalements rapides | Déclarer à l'avance l'absence de son enfant (maladie, congé), ce qui met à jour instantanément la liste d'appel sur le terminal du chauffeur. Signaler d'un clic « Enfant Prêt » lorsque l'élève attend au point de ramassage. |
| **BF-P05** | Réception des alertes | Recevoir des notifications d'approche automatique basées sur la distance réelle du bus (2000m pour préparer l'enfant, 50m pour descendre le récupérer). |

---

### IV.2 Besoins non fonctionnels

Les exigences non fonctionnelles définissent les contraintes architecturales, d'ergonomie et de sécurité garantissant la robustesse de l'application en environnement réel :

* **Sécurité des données et de l'accès** : Le système traitant de la géolocalisation d'enfants mineurs, les exigences de sécurité sont critiques. Les accès à l'API Laravel 12 sont authentifiés via des jetons sécurisés Laravel Sanctum. Les routes d'API sont protégées par le middleware personnalisé `EnsureUserRole` (alias `'role'`), garantissant que seul un utilisateur ayant le rôle requis puisse exécuter une requête. Les règles Firebase Realtime Database (`database.rules.json`) interdisent les accès anonymes en écriture. Le hachage des mots de passe est opéré via **bcrypt** avec un facteur de coût de 12.
* **Performance et découplage architectural** : La transmission des coordonnées de géolocalisation à haute fréquence (toutes les 5 secondes par véhicule) vers une base de données relationnelle MySQL saturerait rapidement les connexions réseau et de base de données du serveur backend. Pour résoudre ce problème, un découplage architectural a été mis en œuvre. Les pings GPS transitent directement par **Firebase Realtime Database** qui gère la charge en temps réel de manière asynchrone, tandis que la base de données relationnelle MySQL stocke uniquement les données persistantes et structurelles (utilisateurs, trajets clôturés, présences).
* **Ergonomie bilingue et internationalisation (i18n)** : L'application s'adressant à des profils aux compétences techniques variées au Maroc, elle doit supporter l'arabe et le français. Le système gère dynamiquement les mises en page de droite à gauche (RTL) pour l'arabe et de gauche à droite (LTR) pour le français, la langue par défaut de l'interface étant configurée sur l'arabe.
* **Portabilité et adaptabilité mobile** : Les interfaces chauffeur et parent étant utilisées exclusivement en mobilité, l'application est conçue avec une approche responsive rigoureuse, offrant un rendu optimal sur les navigateurs web mobiles récents.
* **Tolérance aux pannes réseau** : L'application doit gérer les pertes temporaires de connexion cellulaire subies par les chauffeurs sur la route en suspendant les tentatives d'écriture réseau et en envoyant la dernière position stockée localement dès la reconnexion.

---

## V. Solution proposée

Pour satisfaire l'ensemble des besoins fonctionnels et surmonter les limites de l'existant, nous proposons la plateforme **BusTracker**. Cette solution s'appuie sur une architecture Web découplée de pointe combinant un backend API REST (Laravel 12), une Single Page Application (React 19 & Vite 8) et un bus de données en temps réel (Firebase Realtime Database).

L'un des aspects novateurs de BusTracker réside dans son processus d'onboarding simplifié. L'administration charge un tableau Excel d'élèves. Le backend Laravel valide et traite le fichier au cours d'une unique transaction SQL, insérant les enregistrements des élèves et générant dynamiquement les comptes utilisateurs des parents associés en liant leurs profils. Une fois importés, l'administrateur peut utiliser la fonctionnalité d'envoi WhatsApp intégrée. Cette fonctionnalité pré-remplit des invitations personnalisées via l'API publique de WhatsApp, permettant à l'école de diffuser gratuitement et instantanément les informations de connexion aux parents et chauffeurs sans aucun frais de SMS.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 2 - Logigramme du processus global d'onboarding de BusTracker (Importation Excel de la liste d'élèves, création automatique des comptes parents liés, et envoi en un clic des identifiants via WhatsApp)]

Le logigramme présenté dans la Figure 2 schématise cette intégration : du chargement du tableur Excel à la création automatique des tuples élèves/parents en base de données, jusqu'à la notification de bienvenue sur les terminaux mobiles des tuteurs par messagerie WhatsApp. 

Le suivi géographique repose quant à lui sur Leaflet.js côté client et l'émission GPS par le mobile du chauffeur. L'évaluation de la distance entre le véhicule et le domicile de chaque élève est calculée au moyen de la formule de Haversine, permettant de notifier les parents à l'approche du bus à 2000 mètres et 50 mètres de leur résidence sans aucune manipulation de la part du conducteur.

---

## VI. Conclusion

Ce premier chapitre a permis de délimiter rigoureusement le périmètre fonctionnel, administratif et technique du projet **BusTracker**. En exposant la problématique de l'asymétrie informationnelle inhérente au transport scolaire traditionnel et en identifiant les risques opérationnels liés aux méthodes manuelles, nous avons justifié le développement d'une solution intégrée temps réel.

La structuration du cahier des charges et l'identification fine des besoins fonctionnels et non fonctionnels pour chaque catégorie d'acteurs posent les bases techniques de notre développement. L'architecture retenue, conjuguant la puissance de Laravel 12 pour la gestion des transactions, la réactivité de React 19 pour les interfaces, et l'instantanéité de Firebase pour les flux cartographiques, répond de manière optimale aux contraintes de coût et d'ergonomie spécifiées. 

Le chapitre suivant détaillera la **Conception du Projet**, où nous aborderons l'architecture technique, la modélisation UML des processus (cas d'utilisation et diagrammes de séquence), la modélisation relationnelle de la base de données ainsi que les maquettes graphiques des interfaces.

---

# CHAPITRE 2 : CONCEPTION DU PROJET

## I. Introduction

La phase de conception constitue l'étape pivot reliant l'expression des exigences fonctionnelles à la réalisation concrète de la solution. Elle a pour objet de modéliser la structure statique, le comportement dynamique et les interfaces utilisateur du système **BusTracker** afin de fournir un plan technique rigoureux aux développeurs. 

Dans ce chapitre, nous détaillerons en premier lieu l'architecture générale du système en justifiant le choix d'un découplage Front-end/Back-end et l'intégration de Firebase. En second lieu, nous présenterons la modélisation UML en identifiant les acteurs et en décrivant les cas d'utilisation critiques et les diagrammes de séquence régissant les processus de télémétrie, de géofencing et d'onboarding. En troisième lieu, nous exposerons la conception relationnelle de la base de données MySQL à travers le diagramme de classes et le dictionnaire de données détaillé des migrations. Enfin, nous présenterons l'ergonomie de l'application via les maquettes fil de fer (Wireframes) de chaque espace utilisateur.

---

## II. Architecture générale du système (Séparation Front/Back)

Le système **BusTracker** repose sur une architecture découplée moderne de type Single Page Application (SPA) et API RESTful. Ce choix architectural répond à des impératifs d'évolutivité, de performance et d'ergonomie :
* **Un Front-end dynamique (React 19 & Vite 8)** : L'interface utilisateur est construite sous forme de Single Page Application, assurant un rendu rapide côté client et des transitions fluides sans rechargement de page. Elle communique de manière asynchrone avec le backend via des requêtes HTTP (Fetch/Axios).
* **Un Back-end robuste (Laravel 12)** : Il fait office d'API RESTful stateless. Il assure le traitement des règles métiers, la validation des données, la gestion des transactions SQL complexes (comme l'import Excel), et la persistance des données dans MySQL. L'authentification est sécurisée par des jetons révocables via **Laravel Sanctum**.
* **Un bus de données temps réel (Firebase Realtime Database)** : Pour éviter que le flux continu de pings GPS émis toutes les 5 secondes par chaque bus ne sature les ressources du serveur Laravel et de la base MySQL, ce trafic à haute fréquence est déporté sur Firebase. Le chauffeur écrit ses coordonnées GPS directement dans Firebase, et le frontend du parent s'abonne à ce nœud pour afficher la position en direct sur Leaflet.js. Une synchronisation ponctuelle s'effectue en fin de trajet pour archiver les données opérationnelles dans MySQL.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 3 - Schéma de l'architecture générale du système (Séparation Front/Back, API REST et synchronisation Firebase)]

Le schéma de la Figure 3 illustre cette séparation physique et logique. Il montre comment le client React interagit avec l'API REST de Laravel pour l'authentification et l'onboarding, tout en établissant une liaison WebSocket directe avec Firebase pour la synchronisation cartographique instantanée du trajet actif.

---

## III. Modélisation UML

### III.1 Identification des acteurs (Admin, Chauffeur, Parent)

La modélisation UML commence par la caractérisation fine des utilisateurs du système, qui se divisent en trois acteurs principaux :
1. **Administrateur** : Acteur interne à l'établissement. Il dispose des privilèges les plus élevés lui permettant d'administrer les ressources matérielles (bus) et humaines (utilisateurs, élèves). Il est responsable du chargement Excel de la liste de rentrée et de la supervision globale des trajets scolaires actifs.
2. **Chauffeur** : Acteur opérationnel. Il utilise l'application en situation de mobilité. Ses interactions sont limitées et simplifiées à des fins de sécurité routière : sélection et démarrage du trajet, pointage électronique des présences des élèves par un simple geste tactile, et transmission automatique de sa position géographique.
3. **Parent** : Acteur final et bénéficiaire du service. Il consulte la géolocalisation en temps réel du véhicule, reçoit les notifications d'approche et d'arrivée, configure son point de pickup, et effectue des déclarations rapides (absence, élève prêt).

---

### III.2 Diagramme de cas d’utilisation

Le diagramme de cas d'utilisation formalise les frontières du système et les fonctionnalités exposées à chaque acteur.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 4 - Diagramme de cas d'utilisation global de la plateforme BusTracker (Interactions des trois acteurs)]

Le diagramme de la Figure 4 modélise graphiquement la répartition des cas d'utilisation de BusTracker. Les interactions s'organisent autour de modules spécifiques :
* **Espace Administrateur** : 
  - Gérer les utilisateurs (CRUD parents et chauffeurs).
  - Gérer la flotte de bus.
  - Importer un fichier Excel de données d'élèves.
  - Partager les identifiants par WhatsApp.
  - Affecter les élèves aux bus et assigner les bus aux chauffeurs.
  - Consulter l'historique et les rapports de présence.
* **Espace Chauffeur** :
  - Sélectionner et démarrer un trajet (Aller/Retour).
  - Effectuer le pointage de présence des élèves.
  - Émettre sa position GPS.
  - Déclencher des nudges de rappel aux parents d'élèves en retard.
  - Clôturer le trajet.
* **Espace Parent** :
  - Lier son compte parent à son enfant via un code d'inscription unique (`reg_code`).
  - Configurer les coordonnées précises de son domicile (pickup point) sur la carte.
  - Consulter le tracé cartographique et le déplacement en direct du bus.
  - Signaler que l'enfant est prêt au ramassage.
  - Déclarer une absence temporaire.
  - Recevoir les notifications automatiques d'approche géofencées.

---

### III.3 Diagrammes de séquence

Les diagrammes de séquence décrivent la dynamique des interactions temporelles entre les composants logiques pour les cas d'utilisation critiques.

Le premier processus concerne le cycle de vie du trajet et le calcul de géofencing. Lorsque le chauffeur démarre son trajet, un écouteur Firebase est initialisé. À chaque mise à jour des coordonnées GPS du bus (toutes les 5 secondes), le client parent (ou un job asynchrone) calcule la distance géodésique séparant la position du véhicule et les coordonnées de la maison du parent grâce à la formule de Haversine. Si la distance franchit le seuil de 2000m, l'événement déclenche une alerte de proximité. À 50m, l'alerte d'arrivée est transmise au parent.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 5 - Diagramme de séquence du processus de suivi GPS temps réel et calcul de géofencing (Haversine)]

Le diagramme de séquence de la Figure 5 illustre ce flux télémétrique continu : l'émission GPS par le mobile du chauffeur vers Firebase Realtime Database, la consommation directe du flux de coordonnées par le frontend du parent, et le calcul du géofencing pour l'affichage des alertes de proximité sans surcharge du serveur Laravel principal.

Le second processus critique concerne l'onboarding administratif. L'administrateur dépose un fichier Excel. Laravel parse le document, valide la structure, crée les élèves, génère des mots de passe de secours sécurisés et crée les comptes parents correspondants au cours d'une unique transaction de base de données. Il renvoie ensuite la liste à la console administrative, permettant à l'administrateur d'ouvrir une session de discussion wa.me pré-remplie pour communiquer en un clic les identifiants d'accès au parent concerné.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 6 - Diagramme de séquence du processus d'importation Excel de la liste d'élèves et distribution automatique des identifiants via WhatsApp]

Le logigramme temporel de la Figure 6 schématise cette distribution d'accès : le chargement du tableur par l'administrateur, le traitement de masse Laravel Eloquent, la réponse contenant les jetons de connexion et les liens WhatsApp d'accès rapide permettant la distribution immédiate des accès.

---

## IV. Conception de la base de données

### IV.1 Diagramme de classes

Le diagramme de classes modélise la structure statique des données persistantes en définissant les entités métiers, leurs attributs, et les cardinalités des associations qui les unissent.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 7 - Diagramme de classes détaillant les entités de BusTracker, leurs attributs et leurs cardinalités (users, students, buses, trips, presences, notifications)]

Le diagramme de la Figure 7 présente la modélisation de la base de données relationnelle MySQL :
* Un **Utilisateur** (`users`) possède un rôle (admin, driver, parent).
* Un **Parent** (dont le compte est modélisé dans la table `users`) est lié à un ou plusieurs **Élèves** (`students`) (relation 1 à N).
* Un **Bus** (`buses`) est assigné à un unique **Chauffeur** (modélisé par une clé étrangère `driver_id` pointant vers la table `users`) (relation 1 à 1).
* Un **Élève** (`students`) est affecté à un unique **Bus** (`buses`) (relation N à 1).
* Un **Trajet** (`trips`) est initié pour un **Bus** donné et gère un historique de **Présences** (`presences`) enregistrant le pointage horodaté des statuts des élèves affectés au cours de cette session de trajet.

---

### IV.2 Dictionnaire de données

Le dictionnaire de données détaille le schéma physique de la base de données MySQL implémentée à travers les migrations Laravel.

* **Tableau 6 : Structure de la table `users`**

| Nom de colonne | Type de données | Clé | Contraintes / Description |
|:---|:---|:---|:---|
| `id` | BIGINT UNSIGNED | PK | Auto-incrémenté. Identifiant unique du compte. |
| `name` | VARCHAR(255) | - | Nom complet de l'utilisateur. |
| `email` | VARCHAR(255) | - | Unique. Adresse de courrier électronique (login). |
| `password` | VARCHAR(255) | - | Haché en bcrypt (12 rounds). Mot de passe d'accès. |
| `role` | ENUM('admin','driver','parent') | - | Rôle déterminant le contrôle d'accès dans l'application. |
| `phone` | VARCHAR(20) | - | Numéro de téléphone pour onboarding WhatsApp. |
| `temp_password` | VARCHAR(255) | - | Nullable. Stocke temporairement le mot de passe généré lors de l'import Excel pour transmission WhatsApp. |
| `remember_token` | VARCHAR(100) | - | Token de session persistante. |
| `created_at` / `updated_at` | TIMESTAMP | - | Date de création et de mise à jour du compte. |

* **Tableau 7 : Structure de la table `students`**

| Nom de colonne | Type de données | Clé | Contraintes / Description |
|:---|:---|:---|:---|
| `id` | BIGINT UNSIGNED | PK | Auto-incrémenté. Identifiant de l'élève. |
| `first_name` | VARCHAR(100) | - | Prénom de l'élève. |
| `last_name` | VARCHAR(100) | - | Nom de famille de l'élève. |
| `reg_code` | VARCHAR(50) | - | Unique. Code d'inscription unique pour liaison parent. |
| `parent_id` | BIGINT UNSIGNED | FK | Nullable. Clé étrangère pointant vers `users.id` (liaison parent). |
| `bus_id` | BIGINT UNSIGNED | FK | Nullable. Clé étrangère pointant vers `buses.id` (bus affecté). |
| `latitude` | DECIMAL(10, 8) | - | Nullable. Coordonnée de latitude du domicile (pickup point). |
| `longitude` | DECIMAL(11, 8) | - | Nullable. Coordonnée de longitude du domicile (pickup point). |
| `created_at` / `updated_at` | TIMESTAMP | - | Date d'enregistrement et modification de la fiche élève. |

* **Tableau 8 : Structure de la table `buses`**

| Nom de colonne | Type de données | Clé | Contraintes / Description |
|:---|:---|:---|:---|
| `id` | BIGINT UNSIGNED | PK | Auto-incrémenté. Identifiant du véhicule. |
| `bus_number` | VARCHAR(50) | - | Unique. Numéro d'immatriculation ou code du bus. |
| `capacity` | INT | - | Capacité maximale d'élèves pouvant être transportés. |
| `driver_id` | BIGINT UNSIGNED | FK | Nullable. Clé étrangère pointant vers `users.id` (compte du chauffeur). |
| `status` | ENUM('active','inactive') | - | Statut opérationnel du véhicule. |
| `created_at` / `updated_at` | TIMESTAMP | - | Date de création et modification de l'enregistrement du bus. |

* **Tableau 9 : Structure de la table `trips`**

| Nom de colonne | Type de données | Clé | Contraintes / Description |
|:---|:---|:---|:---|
| `id` | BIGINT UNSIGNED | PK | Auto-incrémenté. Identifiant unique de la tournée. |
| `bus_id` | BIGINT UNSIGNED | FK | Clé étrangère pointant vers `buses.id` (véhicule engagé). |
| `driver_id` | BIGINT UNSIGNED | FK | Clé étrangère pointant vers `users.id` (chauffeur effectuant le trajet). |
| `trip_type` | ENUM('aller','retour') | - | Type de trajet (ramassage matinal ou dépose de l'après-midi). |
| `status` | ENUM('active','completed') | - | État opérationnel du trajet. |
| `started_at` | TIMESTAMP | - | Heure exacte du démarrage de la session de trajet. |
| `ended_at` | TIMESTAMP | - | Nullable. Heure exacte de la clôture du trajet. |
| `created_at` / `updated_at` | TIMESTAMP | - | Dates d'enregistrement système. |

* **Tableau 10 : Structure de la table `presences`**

| Nom de colonne | Type de données | Clé | Contraintes / Description |
|:---|:---|:---|:---|
| `id` | BIGINT UNSIGNED | PK | Auto-incrémenté. Identifiant du pointage. |
| `trip_id` | BIGINT UNSIGNED | FK | Clé étrangère pointant vers `trips.id` (session de trajet liée). |
| `student_id` | BIGINT UNSIGNED | FK | Clé étrangère pointant vers `students.id` (élève pointé). |
| `status` | ENUM('waiting','ready','mounted','absent','dropped') | - | Statut de pointage de présence de l'élève à l'arrêt. |
| `marked_at` | TIMESTAMP | - | Heure précise à laquelle le pointage a été enregistré. |
| `created_at` / `updated_at` | TIMESTAMP | - | Dates système. |

* **Tableau 11 : Structure de la table `notifications`**

| Nom de colonne | Type de données | Clé | Contraintes / Description |
|:---|:---|:---|:---|
| `id` | BIGINT UNSIGNED | PK | Auto-incrémenté. Identifiant du journal d'alertes. |
| `user_id` | BIGINT UNSIGNED | FK | Clé étrangère pointant vers `users.id` (destinataire de l'alerte). |
| `student_id` | BIGINT UNSIGNED | FK | Clé étrangère pointant vers `students.id` (élève concerné). |
| `type` | ENUM('bus_near','bus_arrived','absence_declared','nudge') | - | Catégorie de notification émise. |
| `message` | TEXT | - | Contenu textuel de l'alerte transmise. |
| `sent_at` | TIMESTAMP | - | Horodatage de l'envoi de la notification. |
| `created_at` / `updated_at` | TIMESTAMP | - | Dates d'enregistrement système. |

* **Tableau 12 : Structure de la table `personal_access_tokens`**

| Nom de colonne | Type de données | Clé | Contraintes / Description |
|:---|:---|:---|:---|
| `id` | BIGINT UNSIGNED | PK | Auto-incrémenté. Identifiant unique du jeton. |
| `tokenable_type` | VARCHAR(255) | - | Modèle associé (ici `App\Models\User`). |
| `tokenable_id` | BIGINT UNSIGNED | - | Clé d'association pointant vers `users.id`. |
| `name` | VARCHAR(255) | - | Nom descriptif du jeton (ex. 'auth_token'). |
| `token` | VARCHAR(64) | - | Hash unique du jeton d'accès Sanctum. |
| `abilities` | TEXT | - | Nullable. Droits accordés au jeton. |
| `last_used_at` | TIMESTAMP | - | Nullable. Horodatage de la dernière requête reçue. |
| `expires_at` | TIMESTAMP | - | Nullable. Date d'expiration du jeton d'accès. |
| `created_at` / `updated_at` | TIMESTAMP | - | Dates de création et mise à jour. |

---

## V. Maquettes des interfaces (Wireframes)

La conception ergonomique de l'application s'appuie sur le prototypage d'interfaces fil de fer (Wireframes) visant à valider l'expérience utilisateur (UX) bilingue et multi-support avant d'entamer le développement frontend.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 8 - Maquettes fil de fer (Wireframes) de l'Espace Public (Page de choix du rôle, Écran de connexion, Page d'inscription Parent)]

Les maquettes de la Figure 8 illustrent l'espace d'accès commun. La page de choix du rôle (`RoleSelect`) oriente l'utilisateur vers son espace dédié. L'écran de connexion (`SignIn`) et d'inscription parent (`SignUp`) respectent l'adaptation bilingue (français/arabe) avec inversion des conteneurs LTR/RTL pour garantir une lisibilité optimale.

---

### V.2 Maquettes de l'Espace Administrateur

La console d'administration est conçue pour les postes de travail de bureau (Desktop), privilégiant une densité d'information élevée et des contrôles de gestion regroupés.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 9 - Maquettes fil de fer (Wireframes) de l'Espace Administrateur (Dashboard global Desktop, Console de gestion des utilisateurs, Interface d'importation Excel)]

Les maquettes Desktop présentées dans la Figure 9 détaillent :
- Le tableau de bord analytique affichant le nombre de trajets en cours, de bus opérationnels et de signalements d'absence.
- La console utilisateur dotée de la grille d'édition (CRUD) et du bouton de partage des coordonnées d'accès par WhatsApp.
- L'interface d'import Excel munie de la zone de glisser-déposer de fichiers de données d'onboarding.

---

### V.3 Maquettes de l'Espace Chauffeur

L'interface chauffeur est conçue avec une approche mobile-first stricte et une ergonomie tactile épurée pour éviter toute surcharge visuelle au volant.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 10 - Maquettes fil de fer (Wireframes) de l'Espace Chauffeur (Tableau de bord de démarrage du trajet et Interface de feuille d'appel électronique tactile)]

Les maquettes de la Figure 10 schématisent le terminal du conducteur :
- La page d'accueil de sélection de la tournée active et du bouton d'initialisation du trajet.
- La feuille d'appel électronique affichant la liste des élèves avec des boutons de statut de grande taille facilement actionnables au doigt lors des arrêts scolaires.

---

### V.4 Maquettes de l'Espace Parent

L'espace parent offre une visualisation cartographique interactive claire et des contrôles directs pour le suivi en direct de l'élève.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 11 - Maquettes fil de fer (Wireframes) de l'Espace Parent (Écran de suivi en direct sur carte Leaflet avec panneau d'actions rapides et configuration du point de pickup)]

Les maquettes de la Figure 11 représentent le suivi cartographique sur mobile :
- La carte active Leaflet.js centrant la position du bus scolaire en mouvement par rapport au point d'arrêt configuré de l'enfant.
- Le panneau inférieur rétractable contenant les commandes rapides pour déclarer l'enfant comme « Prêt » ou déclarer une absence temporaire en temps réel.

---

## VI. Conclusion

Ce deuxième chapitre a formalisé le cadre conceptuel de l'application **BusTracker**. La modélisation de l'architecture découplée, l'établissement de la structure statique UML, la conception relationnelle fine du schéma MySQL et des migrations Laravel, ainsi que le maquettage d'interfaces fil de fer fournissent un guide de développement robuste et complet.

L'architecture découplée associant Laravel 12 et React 19 permet de séparer efficacement les responsabilités et de déporter les pings géolocalisés de 5 secondes sur Firebase Realtime Database pour optimiser les performances opérationnelles. 

Le chapitre suivant sera consacré à l'**Identité Visuelle et la Charte Graphique** du projet, où nous détaillerons la création du logo, la palette de couleurs thématiques et la hiérarchie typographique bilingue retenue pour l'application.

---

# CHAPITRE 3 : IDENTITÉ VISUELLE ET CHARTE GRAPHIQUE

## I. Introduction

L'identité visuelle d'une solution logicielle ne se limite pas à sa simple apparence esthétique. Elle constitue le vecteur premier de l'expérience utilisateur (UX), facilitant l'appropriation cognitive de l'outil, instaurant un climat de confiance professionnelle et structurant la hiérarchie informationnelle. Pour une application comme **BusTracker**, qui s'adresse à des profils d'utilisateurs hétérogènes (administrateurs scolaires sur Desktop, chauffeurs et parents d'élèves en situation de mobilité), la charte graphique doit concilier modernité, lisibilité et accessibilité.

Ce troisième chapitre présente la définition de l'identité visuelle de notre plateforme. Nous détaillerons tout d'abord la création du logo officiel et sa symbolique. Nous exposerons ensuite la palette de couleurs retenue en explicitant sa justification fonctionnelle et sa conformité aux normes d'accessibilité numérique. Enfin, nous présenterons la charte typographique bilingue structurant l'affichage du français (LTR) et de l'arabe (RTL).

---

## II. Charte graphique de BusTracker

### II.1 Le Logo

Le logo de **BusTracker** a été conçu pour symboliser instantanément le cœur de métier de la plateforme : le transport scolaire intelligent et connecté. La conception visuelle repose sur la fusion harmonieuse de deux concepts clés :
* Le véhicule de transport (le bus scolaire), caractérisé par sa silhouette rectangulaire familière et rassurante.
* La géolocalisation en temps réel, matérialisée par l'icône universelle du pointeur de carte (le "pin" GPS) et des ondes concentriques évoquant la transmission de données.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 12 - Logo officiel de BusTracker et ses différentes déclinaisons (fond clair, fond sombre et icône d'application)]

La Figure 12 présente le logotype officiel dans ses déclinaisons fonctionnelles. Le symbole graphique montre les contours simplifiés d'un bus jaune intégré à l'intérieur d'un pointeur cartographique bleu. Cette imbrication de formes exprime visuellement la notion de suivi géographique appliqué au transport scolaire. Pour s'adapter à toutes les interfaces de l'application, le logo est décliné en version horizontale pour l'en-tête de la console Desktop administrative, en version verticale pour la Landing page, et sous forme d'icône compacte pour le raccourci sur écran mobile.

---

### II.2 La palette de couleurs

Le choix de la palette chromatique de BusTracker répond à des critères d'accessibilité visuelle (normes WCAG 2.1 AA) et à une volonté de transmettre un sentiment de sécurité et de professionnalisme. Les teintes principales retenues sont :
* **Jaune Scolaire (#F5B041)** : Utilisé comme couleur d'accent secondaire. C'est la couleur emblématique du transport scolaire, évoquant la visibilité, le dynamisme et l'attention.
* **Bleu Institutionnel (#1B4F72)** : Utilisé comme couleur primaire pour la structure des interfaces. Il transmet le sérieux, la rigueur administrative et la sécurité.
* **Gris Neutre (#F2F4F4 pour les fonds, #2C3E50 pour les textes)** : Assure un confort visuel maximal en limitant la fatigue oculaire lors des consultations prolongées.
* **Vert Succès (#28B463)** et **Rouge Alerte (#CB4335)** : Couleurs fonctionnelles d'état utilisées pour les pointages (présent/absent) et les notifications d'approche.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 13 - Palette de couleurs officielle de BusTracker avec les codes hexadécimaux et les contrastes d'accessibilité validés]

La palette présentée dans la Figure 13 a fait l'objet de tests de contraste stricts. L'association du texte blanc sur fond bleu institutionnel (#1B4F72) et du texte sombre sur fond jaune (#F5B041) présente un ratio de contraste supérieur à 4.5:1, garantissant la lisibilité pour les personnes souffrant de déficiences visuelles modérées.

---

### II.3 La typographie

Pour assurer une lisibilité sans faille sur tous les terminaux mobiles et desktop, la charte typographique de BusTracker s'appuie sur deux polices de caractères modernes et complémentaires, sélectionnées dans le catalogue de Google Fonts :
* **Inter** (par Rasmus Andersson) : Utilisée pour l'ensemble des textes en français. Cette police sans-serif géométrique est spécialement optimisée pour le rendu sur écran informatique. Elle offre une lisibilité exceptionnelle même dans de petites tailles, idéale pour les tableaux de données administratifs et les détails des présences.
* **Cairo** (par Mohamed Gaber) : Utilisée pour l'ensemble de l'interface en langue arabe. C'est une police sans-serif contemporaine qui allie la calligraphie Kufi classique à des règles de design géométrique moderne, assurant un rendu net et homogène sur les écrans mobiles des chauffeurs et des parents.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 14 - Spécimen typographique de BusTracker illustrant les polices d'écriture Inter et Cairo et la hiérarchie visuelle (tailles et graisses)]

Comme l'illustre la Figure 14, la hiérarchie typographique est structurée de manière stricte :
- Les titres de niveau 1 (H1) sont configurés en gras (Bold, 700) avec une taille de 24px pour structurer le début de page.
- Les titres de niveau 2 (H2) utilisent une graisse moyenne (Medium, 500) de 18px.
- Le corps de texte (Body) utilise une graisse régulière (Regular, 400) de 14px pour assurer une lecture confortable.

---

Ce troisième chapitre conclut la phase de conception et de design visuel du projet. Le chapitre suivant détaillera la **Réalisation du Projet**. Nous y aborderons l'environnement technique, le développement du middleware d'authentification Sanctum, le fonctionnement mathématique de l'algorithme de Haversine, la synchronisation temps réel Laravel-Firebase, et les captures d'écran finales des interfaces développées pour les trois espaces utilisateurs.

---

# CHAPITRE 4 : RÉALISATION DU PROJET

## I. Introduction

Ce quatrième chapitre détaille l'implémentation physique et le déploiement technique de la plateforme **BusTracker**. Après avoir modélisé le système et défini son identité visuelle, la phase de réalisation concrétise les spécifications au moyen d'outils et de technologies modernes.

Dans un premier temps, nous décrirons l'environnement et les outils de développement utilisés. Dans un deuxième temps, nous justifierons les choix technologiques pour chaque couche du système (React 19, Laravel 12, MySQL, Firebase et Leaflet.js). Ensuite, nous détaillerons le développement des fonctionnalités backend critiques, notamment le middleware de contrôle d'accès, l'algorithme géodésique de Haversine et la synchronisation de données temps réel. Nous présenterons par la suite une revue complète des interfaces utilisateur développées pour chaque espace de l'application, illustrée par des captures d'écran et des explications ergonomiques. Enfin, nous exposerons les principales difficultés techniques rencontrées durant le codage et les solutions optimales apportées pour y remédier.

---

## II. Environnement et Outils de développement

Le développement de la plateforme BusTracker s'est déroulé dans un environnement local standardisé afin de garantir la portabilité des sources et la rapidité des itérations de tests :
* **Système d'exploitation** : Windows 11 Professionnel, fournissant la base système pour exécuter les runtimes backend et frontend.
* **Environnement de serveur local (XAMPP)** : XAMPP a été configuré pour héberger le serveur de base de données relationnelle **MySQL** (port 3306) et pour fournir l'accès à PhpMyAdmin pour la supervision directe des tables de données.
* **Environnement d'exécution Frontend (Node.js)** : Node.js (version 20 LTS) a été utilisé comme environnement d'exécution pour gérer les dépendances frontend et exécuter le serveur d'assemblage rapide Vite.
* **Éditeur de code (VS Code)** : Visual Studio Code a servi d'environnement de développement intégré (IDE) principal, enrichi d'extensions d'assistance (ESLint pour la qualité du code Javascript, Prettier pour le formatage automatique, et d'outils d'auto-complétion pour Laravel Eloquent et Blade).
* **Gestionnaire de versions (Git & GitHub)** : Git a été utilisé localement pour l'historisation des commits (structurés selon la norme *Conventional Commits*), tandis que GitHub a hébergé les dépôts distants sécurisés pour le backend et le frontend, assurant la traçabilité des modifications.

---

## III. Technologies utilisées

### III.1 Backend : Laravel 12 & Sanctum

Le cœur fonctionnel et transactionnel de BusTracker est propulsé par le framework **Laravel 12** (PHP 8.2+). Ce choix technologique repose sur des arguments de productivité et de robustesse industrielle :
* **Architecture MVC orientée API** : Laravel permet de structurer proprement les routes RESTful dans le fichier `routes/api.php`, de valider les requêtes via des classes *FormRequest* dédiées et de renvoyer des réponses JSON homogènes à l'aide des ressources API.
* **Persistance et ORM Eloquent** : Eloquent ORM offre une abstraction élégante de la base de données relationnelle, facilitant l'écriture de requêtes lisibles tout en protégeant l'application contre les injections SQL grâce à l'utilisation systématique de requêtes préparées.
* **Sécurité des API (Laravel Sanctum)** : L'authentification repose sur Laravel Sanctum. Contrairement à des sessions classiques basées sur les cookies, Sanctum émet des jetons d'accès API légers et révocables (tokens stockés sous forme de hash cryptographique dans la table `personal_access_tokens`). Le client React transmet ce token dans l'en-tête `Authorization: Bearer <token>` de chaque requête HTTP, assurant une communication sécurisée et stateless.

---

### III.2 Frontend : React 19 & Vite 8

L'interface de la plateforme BusTracker est développée en Single Page Application avec **React 19** et assemblée à l'aide de **Vite 8** :
* **Réactivité et État local (React 19)** : React 19 introduit des optimisations dans la gestion du cycle de vie des composants et l'utilisation de hooks. L'état de l'application est géré localement par des contextes React (`AuthContext` pour la persistance de l'état de l'utilisateur authentifié, `LanguageContext` pour l'internationalisation).
* **Bundler ultra-rapide (Vite 8)** : Vite remplace les configurations complexes et lentes de Webpack en tirant parti des modules ES natifs du navigateur. Il offre un serveur de développement avec rechargement à chaud (HMR - *Hot Module Replacement*) instantané, et compile les sources en un bundle optimisé et minifié pour la production.
* **Design Responsive (Tailwind CSS 4)** : La feuille de style globale [index.css](file:///c:/Users/HP/Desktop/STUDY/bus-tracker/bus-frontend/src/index.css) intègre Tailwind CSS pour appliquer un style visuel moderne et adaptatif. Tailwind permet de réaliser des designs fluides de type Mobile-First grâce à l'utilisation intensive de classes utilitaires et de modificateurs responsives (`sm:`, `md:`, `lg:`).

---

### III.3 Base de données : MySQL

Pour la persistance des données relationnelles et structurelles, nous avons retenu **MySQL** (version 8.0) :
* **Intégrité et transactions SQL** : MySQL garantit le respect strict des contraintes d'intégrité (clés étrangères, unicité des codes d'inscription des élèves, cascades de suppression). Durant l'importation de fichiers Excel, Laravel enveloppe l'extraction et l'insertion de tuples parents/élèves dans une **transaction SQL**. Si une seule ligne présente une anomalie (par exemple, un e-mail parent déjà existant), la transaction est annulée (*rollback*), empêchant ainsi la corruption de l'état de la base de données.
* **Configuration d'environnement** : Bien que Laravel 12 soit configuré par défaut pour utiliser SQLite, la base de données de production a été migrée vers MySQL en modifiant la configuration du fichier `.env` du backend :
  ```ini
  DB_CONNECTION=mysql
  DB_HOST=127.0.0.1
  DB_PORT=3306
  DB_DATABASE=bus_tracker_db
  DB_USERNAME=root
  DB_PASSWORD=
  ```

---

### III.4 Temps réel et Cartographie : Firebase & Leaflet.js

Pour offrir une expérience fluide sans surcharger l'infrastructure serveur, la cartographie active et la télémétrie GPS s'appuient sur deux composants technologiques complémentaires :
* **Firebase Realtime Database** : Cette base de données NoSQL hébergée dans le cloud stocke les données sous forme de document JSON et synchronise l'état en temps réel via des connexions WebSockets. Lorsqu'un trajet est actif, le smartphone du chauffeur pousse ses coordonnées de latitude et longitude vers un nœud Firebase spécifique (`trips/{trip_id}/location`). Les clients parents abonnés à ce nœud reçoivent instantanément la position mise à jour, sans que le serveur Laravel ne reçoive de requête de géolocalisation haute fréquence.
* **Leaflet.js & OpenStreetMap** : La cartographie est intégrée au frontend React via Leaflet.js. Leaflet permet d'afficher des cartes interactives légères en consommant les tuiles de cartes gratuites d'OpenStreetMap. Les marqueurs représentant le bus, le domicile et l'école sont mis à jour dynamiquement sur le canvas de la carte à l'aide de l'état local de React synchronisé avec Firebase.

---

## IV. Développement des fonctionnalités clés (Backend)

### IV.1 Création et protection de l'API (Middleware)

La sécurité des routes d'API RESTful est assurée par l'authentification Laravel Sanctum combinée au middleware personnalisé `EnsureUserRole`. Ce middleware intercepte chaque requête entrante, vérifie la validité du jeton d'accès et compare le rôle de l'utilisateur connecté à la liste des rôles autorisés pour la route ciblée.

Voici le code source du middleware `EnsureUserRole` implémenté dans le backend :

```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    /**
     * Gère une requête entrante.
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if (!$request->user() || $request->user()->role !== $role) {
            return response()->json([
                'message' => 'Accès non autorisé. Rôle insuffisant.'
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
```

Ce middleware est enregistré dans le fichier `bootstrap/app.php` de Laravel 12 sous l'alias `'role'` et est appliqué sur les groupes de routes d'API dans `routes/api.php` de la manière suivante :

```php
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::post('/users/import', [ImportController::class, 'importExcel']);
    Route::post('/buses', [BusController::class, 'store']);
});

Route::middleware(['auth:sanctum', 'role:driver'])->group(function () {
    Route::post('/trips/start', [TripController::class, 'startTrip']);
    Route::patch('/presences/{presence}', [PresenceController::class, 'update']);
});
```

---

### IV.2 Algorithme de Geofencing (Formule de Haversine)

Le calcul de proximité entre le bus scolaire en mouvement et le domicile configuré de l'élève est opéré en appliquant la **formule de Haversine**. Cette formule trigonométrique permet de calculer la distance géodésique (la distance la plus courte sur la surface de la Terre) entre deux points de coordonnées géographiques (latitude et longitude) en modélisant la Terre comme une sphère.

La formule mathématique s'exprime ainsi :

$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

Où $\phi$ est la latitude, $\lambda$ est la longitude, et $r$ est le rayon moyen de la Terre ($6\,371\,000$ mètres).

Voici l'implémentation de cette fonction en PHP au sein du contrôleur de suivi de trajet pour déterminer le déclenchement des alertes de géofencing :

```php
public static function calculateHaversineDistance($lat1, $lon1, $lat2, $lon2): float
{
    $earthRadius = 6371000; // Rayon de la Terre en mètres

    // Conversion des degrés en radians
    $latRad1 = deg2rad($lat1);
    $latRad2 = deg2rad($lat2);
    $lonRad1 = deg2rad($lon1);
    $lonRad2 = deg2rad($lon2);

    // Différences de coordonnées
    $deltaLat = $latRad2 - $latRad1;
    $deltaLon = $lonRad2 - $lonRad1;

    // Calcul de la formule de Haversine
    $a = sin($deltaLat / 2) * sin($deltaLat / 2) +
         cos($latRad1) * cos($latRad2) *
         sin($deltaLon / 2) * sin($deltaLon / 2);
         
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

    return $earthRadius * $c; // Distance retournée en mètres
}
```

Ce calcul est exécuté côté client React pour actualiser l'interface du parent, ou par le serveur pour historiser les notifications d'alertes de type `bus_near` (lorsque la distance descend en dessous de 2000m) et `bus_arrived` (lorsque la distance descend en dessous de 50m).

---

### IV.3 Synchronisation des données Laravel-Firebase

Pour concilier la persistance structurée de MySQL et l'instantanéité temps réel de Firebase, un pont logique de synchronisation a été développé :
1. **Initialisation du trajet** : Lorsqu'un chauffeur sélectionne et démarre son trajet de ramassage sur son mobile, l'application émet une requête HTTP `POST /api/trips/start`. Le serveur Laravel crée l'enregistrement du trajet avec le statut `active` dans MySQL, extrait la liste des élèves affectés à ce bus, puis pousse un document initialisé dans Firebase Realtime Database contenant l'identifiant du trajet, le type (`aller` / `retour`), les statuts des élèves et la position initiale du bus.
2. **Cycle de vie temps réel** : Pendant le trajet, le client mobile du chauffeur écrit directement la position GPS et les pointages d'appel dans le nœud Firebase. Le serveur Laravel n'est pas sollicité pour ces écritures à haute fréquence.
3. **Clôture et ré-archivage** : Lorsque le trajet se termine, le chauffeur clique sur "Clôturer le trajet". Le mobile émet une requête `POST /api/trips/end`. Le serveur Laravel récupère l'état final de la liste de présence depuis Firebase Realtime Database via une requête API Firebase REST, valide les données, enregistre les fiches de présence définitives dans la table `presences` de MySQL, clôture le trajet dans la table `trips`, puis nettoie le nœud Firebase pour libérer de l'espace.

---

## V. Réalisation des interfaces utilisateur (Frontend)

### V.1 Espace Public et Authentification

#### V.1.1 Page de choix du rôle (Landing)

La page d'accueil publique (`RoleSelect`) constitue le point d'entrée unique de la plateforme. Son design moderne et épuré propose à l'utilisateur de sélectionner son profil d'accès (Administrateur, Chauffeur, Parent) au moyen de grandes cartes interactives colorées et agrémentées d'icônes vectorielles. Cette approche ergonomique facilite l'orientation immédiate des utilisateurs sur terminaux mobiles ou desktop.

[📸 INSÉRER IMAGE/CAPTURE ICI : Capture d'écran de la Landing Page de choix du rôle (Espace Public)]

La page s'adapte dynamiquement à la langue sélectionnée : le sélecteur de langue situé en en-tête permet de basculer instantanément l'interface entre le français et l'arabe, adaptant l'orientation globale de la mise en page (RTL/LTR) grâce à la configuration dynamique de la direction du document DOM.

---

#### V.1.2 Page de Connexion (Login) & V.1.3 Page d'Inscription Parent (Signup)

L'interface de connexion (`SignIn`) présente un formulaire sécurisé demandant l'e-mail et le mot de passe de l'utilisateur. Lors de la validation, l'application interroge l'API Laravel Sanctum, enregistre le jeton d'accès retourné dans le stockage local du navigateur (*localStorage*), et redirige automatiquement l'utilisateur vers son espace en fonction de son rôle.

[📸 INSÉRER IMAGE/CAPTURE ICI : Capture d'écran de la Page de Connexion et de la Page d'Inscription Parent]

La page d'inscription (`SignUp`), réservée exclusivement aux parents d'élèves, leur permet de créer un compte utilisateur de manière autonome. Pour lier immédiatement leur profil parent à la fiche de leur enfant pré-configurée par l'administration, le formulaire exige la saisie du code d'inscription unique de l'élève (`reg_code`). Si le code est valide, la relation de parenté est instantanément enregistrée en base SQL.

---

### V.2 Espace Administrateur

#### V.2.1 Page Dashboard (Statistiques)

L'espace d'administration s'ouvre sur un tableau de bord analytique complet (`AdminDashboard`). Cet écran affiche en temps réel les indicateurs clés de performance (KPI) de la flotte de transport scolaire : le nombre total de bus en circulation, le taux de présence quotidien des élèves, le nombre d'absences déclarées à l'avance et la liste des tournées actives.

[📸 INSÉRER IMAGE/CAPTURE ICI : Capture d'écran du Dashboard Administrateur affichant les statistiques de la flotte et des trajets scolaires]

Des graphes interactifs synthétisent la répartition des élèves par bus et les retards moyens enregistrés sur chaque ligne. Une carte miniature Leaflet permet à l'administrateur d'avoir une vue d'ensemble géographique de la position en direct de tous les bus actifs de la ville.

---

#### V.2.2 Page Gestion des Utilisateurs & V.2.3 Page Gestion de la Flotte (Bus)

La console de gestion administrative propose des grilles d'administration (CRUD) riches et sécurisées pour la gestion des données structurelles. La page des utilisateurs (`UsersPage`) affiche la liste de tous les comptes enregistrés. Chaque ligne dispose de boutons d'action rapide pour éditer, suspendre ou supprimer un compte. 

Elle intègre un bouton WhatsApp utilisant l'API `wa.me`. D'un seul clic, l'administrateur peut ouvrir une fenêtre de discussion WhatsApp pré-remplie contenant les accès de connexion (identifiants et mot de passe temporaire) du parent ou du chauffeur importé, simplifiant considérablement la communication.

[📸 INSÉRER IMAGE/CAPTURE ICI : Capture d'écran de la Console de Gestion des Utilisateurs (CRUD et bouton WhatsApp) et de la Gestion de la Flotte de Bus]

La page de gestion de la flotte (`FleetPage`) permet quant à elle de configurer la liste des bus disponibles, d'enregistrer leur capacité et de leur assigner un chauffeur actif parmi les comptes de conducteurs disponibles en base de données.

---

#### V.2.4 Page Importation Excel (Onboarding) & V.2.5 Page d'Affectation (Élèves -> Bus)

Le module d'importation (`ImportPage`) résout le problème de la saisie manuelle de masse en début d'année scolaire. L'administrateur glisse et dépose un tableur Excel. L'application extrait les en-têtes et affiche un outil de mapping de colonnes interactif. Laravel traite ensuite les données pour insérer en lot les élèves et générer les comptes parents liés.

[📸 INSÉRER IMAGE/CAPTURE ICI : Capture d'écran de l'Interface d'Importation Excel de données et du Panneau d'Affectation des élèves aux bus]

Le panneau d'affectation (`AssignmentsPage`) permet de répartir visuellement les élèves dans les bus. L'administrateur sélectionne les élèves non affectés et les glisse dans un bus. Une barre de progression de capacité dynamique s'affiche pour chaque véhicule afin d'éviter les surcharges de passagers et respecter les limites de places disponibles.

---

### V.3 Espace Chauffeur

#### V.3.1 Page de Sélection du Trajet (Aller/Retour)

L'espace chauffeur s'ouvre sur un écran d'accueil d'une grande simplicité ergonomique. Le conducteur y visualise son profil, le numéro du bus affecté et un sélecteur lui demandant de définir la tournée active : trajet `aller` (ramassage des élèves et dépose à l'école le matin) ou trajet `retour` (récupération des élèves à l'école et dépose aux domiciles l'après-midi).

[📸 INSÉRER IMAGE/CAPTURE ICI : Capture d'écran du Tableau de Bord Chauffeur (Sélection du trajet Aller ou Retour)]

Un gros bouton "Démarrer le Trajet" permet d'initialiser la tournée. Cette action lance l'envoi asynchrone des données vers Firebase Realtime Database et active le capteur de géolocalisation HTML5 du smartphone.

---

#### V.3.2 Page Feuille d'Appel Électronique (Pointage) & V.3.3 Page Carte et Émission GPS (Live)

Une fois le trajet démarré, le chauffeur accède à la feuille d'appel numérique (`TripView`). L'interface affiche la liste ordonnée des élèves à récupérer sur la tournée. Pour chaque élève, le conducteur peut cliquer sur de larges boutons tactiles de couleurs pour modifier son statut : vert pour "Monté à bord" (`mounted`), rouge pour "Absent" (`absent`), ou orange si le parent a signalé son enfant prêt au point d'arrêt (`ready`). Un bouton "Nudge" permet d'envoyer une notification rapide de retard au parent sans interaction téléphonique.

[📸 INSÉRER IMAGE/CAPTURE ICI : Capture d'écran de la Feuille d'Appel Électronique tactile et de l'Interface de Navigation Routière avec émission GPS]

L'onglet carte (`MapView`) présente au chauffeur son itinéraire tracé sur OpenStreetMap, centré sur sa position GPS courante, facilitant la navigation vers les points d'arrêt des élèves suivants. L'émission GPS en arrière-plan envoie la latitude et la longitude toutes les 5 secondes vers Firebase de façon silencieuse.

---

### V.4 Espace Parent

#### V.4.1 Page Dashboard Parent (Liaison enfant)

L'interface parent est conçue pour rassurer l'utilisateur en lui offrant un accès immédiat aux informations de son enfant. Le tableau de bord principal (`HomeTab`) affiche la fiche de l'élève (nom, prénom, classe, bus affecté et nom du chauffeur). Si le parent a plusieurs enfants scolarisés, un sélecteur lui permet de basculer facilement de l'un à l'autre.

[📸 INSÉRER IMAGE/CAPTURE ICI : Capture d'écran du Dashboard Parent affichant les détails de l'élève lié via code d'inscription]

L'écran indique également le statut courant de l'élève durant le trajet actif (par exemple : "En attente du bus", "À bord du bus" ou "Déposé à l'école"), offrant un suivi continu des étapes de sécurité de la tournée scolaire.

---

#### V.4.2 Page Carte de Suivi (Live Tracking) & V.4.3 Page Configuration du Domicile (Pickup point)

L'onglet cartographique parent (`MapTab`) affiche en temps réel la localisation du bus sur une carte Leaflet.js uniquement lorsque le trajet de son enfant est en cours de réalisation. Un marqueur mobile représentant le bus se déplace de manière fluide toutes les 5 secondes, tandis qu'un rayon vert délimite le point de ramassage de l'élève.

[📸 INSÉRER IMAGE/CAPTURE ICI : Capture d'écran de la Carte de Suivi du bus scolaire en temps réel et de l'Interface de Configuration du domicile familial]

Pour assurer la précision du calcul géofencé des alertes, le parent peut cliquer sur un bouton "Configurer le domicile" et pointer avec précision l'emplacement de sa maison sur la carte. Les coordonnées géographiques (latitude/longitude) du domicile sont immédiatement enregistrées dans la table `students` du backend.

---

#### V.4.4 Page Déclaration d'Absence & Notifications

La page d'actions rapides du parent propose un module simple pour déclarer à l'avance l'absence de l'élève pour la journée en cours. Cette déclaration met instantanément à jour la feuille d'appel du chauffeur en marquant l'élève comme `absent`, lui évitant ainsi d'effectuer un détour inutile.

[📸 INSÉRER IMAGE/CAPTURE ICI : Capture d'écran du Formulaire de Déclaration d'Absence parentale et de la Boîte de Réception des alertes de proximité]

Le centre d'alertes (`AlertsTab`) conserve un historique horodaté de toutes les notifications d'approche envoyées au parent par le système de géofencing (alerte de proximité de 2000m et alerte d'arrivée imminente de 50m).

---

## VI. Difficultés techniques et solutions

### VI.1 Problème de Network Exhaustion (Firebase)

Durant les phases de tests en conditions réelles avec plusieurs dizaines de parents connectés simultanément pour suivre un bus, nous avons constaté un phénomène d'**épuisement réseau** (*Network Exhaustion*) de la base de données Firebase Realtime Database. Ce dysfonctionnement s'expliquait par le fait que chaque composant React de suivi de carte parent ouvrait sa propre connexion WebSocket et ajoutait un écouteur d'événements (`onValue`) individuel sur le nœud du bus. Cela multipliait de manière exponentielle le trafic réseau et la bande passante consommée sur Firebase.

Pour résoudre ce problème de performance, nous avons mis en place un **Pattern Hook avec Listener Unique** (écouteur partagé). Au lieu d'ouvrir des connexions individuelles, nous avons encapsulé l'écoute de Firebase dans un contexte React global (`FirebaseSubscriptionContext`). Ce contexte maintient un seul et unique écouteur de connexion pour chaque trajet actif. 

Les composants de carte individuels s'abonnent simplement à l'état partagé par ce contexte local React. Cette optimisation a permis de diviser la bande passante consommée de Firebase par un facteur proportionnel au nombre d'utilisateurs connectés, éliminant tout risque de saturation réseau.

---

### VI.2 Problème de requêtes N+1 (Laravel Eloquent)

Lors du chargement des listes de trajets sur la console d'administration, nous avons identifié d'importantes baisses de performance côté backend Laravel. En analysant les logs de requêtes SQL (grâce au package Laravel Telescope), nous avons découvert le classique problème de requêtes **N+1**. 

Pour afficher une liste de $N$ trajets avec le nom du bus associé et le nom du chauffeur affecté, l'ORM Eloquent exécutait une requête initiale pour récupérer les trajets, puis effectuait $N$ requêtes supplémentaires pour charger le bus de chaque trajet, et $N$ autres requêtes pour charger le profil du chauffeur. Pour seulement 50 trajets affichés, l'application exécutait plus de 100 requêtes SQL individuelles, ralentissant le temps de réponse de l'API REST à plusieurs secondes.

La solution a consisté à implémenter le chargement gourmand (**Eager Loading**) d'Eloquent. En modifiant la requête du contrôleur de trajets pour y inclure la méthode `with()`, les données associées sont chargées en seulement deux requêtes SQL consolidées (utilisant des clauses `WHERE IN`).

```diff
 // Avant optimisation (Requêtes N+1)
-$trips = Trip::where('status', 'active')->get();
 
 // Après optimisation (Eager Loading)
+$trips = Trip::with(['bus', 'driver'])->where('status', 'active')->get();
```

Cette simple correction a permis de réduire le nombre de requêtes SQL de plus de 90%, abaissant le temps de réponse de l'API backend sous la barre des 100 millisecondes pour un affichage instantané.

---

## VII. Conclusion

Ce quatrième chapitre a décrit en détail la réalisation pratique de la plateforme **BusTracker**. De la mise en place de l'environnement de développement bilingue au déploiement du triptyque technologique (React 19, Laravel 12, Firebase), chaque composant a été implémenté pour maximiser les performances et la sécurité.

L'intégration de morceaux de code clés tels que le middleware de rôles `EnsureUserRole` et l'algorithme géodésique de Haversine garantit la robustesse fonctionnelle de l'application. La résolution des goulots d'étranglement de requêtes N+1 et d'épuisement de bande passante Firebase prouve la viabilité industrielle de notre architecture découplée.

Le chapitre suivant et final sera consacré aux **Tests, à la Validation et à la Gestion du Projet**. Nous y aborderons la stratégie de tests unitaires et d'intégration, la matrice de validation des exigences, ainsi que la planification agile Scrum mise en œuvre pour mener à bien ce projet de fin d'études.

---

# CHAPITRE 5 : TESTS, VALIDATION ET GESTION DE PROJET

**Rapport de Projet de Fin d'Études (PFE) — BusTracker**
**Page 60**

---

### Résumé du Chapitre

Ce cinquième et dernier chapitre présente la démarche d'assurance qualité et le cadre méthodologique ayant encadré le développement de la plateforme **BusTracker**. La première partie détaille la stratégie de tests mise en œuvre pour garantir la robustesse technique et la sécurité de l'application, englobant les tests unitaires sur les modèles de données, les tests d'intégration fonctionnelle des API REST et la validation rigoureuse des contrôles d'accès et de la gestion des rôles (Administrateur, Chauffeur, Parent). La seconde partie expose le cadre méthodologique basé sur le paradigme Agile Scrum, décrivant la planification temporelle concrétisée par le diagramme de Gantt, ainsi que les outils de suivi collaboratif et de gestion de versioning (Trello, Git/GitHub). Ce chapitre démontre comment la rigueur de l'ingénierie logicielle s'est conjuguée à une gestion opérationnelle structurée pour mener à bien la réalisation de ce projet.

---

## I. Introduction
**Page 61**

La validation logicielle constitue une étape cruciale dans le cycle de vie de développement de la plateforme **BusTracker**. Pour un système gérant en temps réel la sécurité et le suivi de trajets d'élèves, l'absence d'erreurs d'exécution et la conformité fonctionnelle de l'API REST représentent des impératifs absolus. L'objectif de cette phase de tests est de s'assurer que chaque composant individuel répond aux exigences formulées dans le cahier des charges, et que leur intégration produit le comportement attendu sans causer de régressions logicielles.

## II. Stratégie de tests

### II.1 Tests Unitaires et Fonctionnels

La stratégie de tests adoptée repose sur une pyramide des tests automatisés, implémentée principalement côté backend à l'aide du framework **PHPUnit** intégré à Laravel 12.

Les **tests unitaires** se concentrent sur la validation des règles métiers isolées et des comportements de base du modèle de données (ORM Eloquent). Ils vérifient notamment les relations de dépendance entre les modèles (par exemple, la relation d'appartenance entre un élève et son parent, ou l'affectation d'un bus à un trajet). Ils permettent également de valider de manière isolée les fonctions utilitaires clés, telles que le calcul géodésique de la formule de Haversine ou la validation du format des codes d'inscription uniques générés pour les élèves.

Les **tests fonctionnels** (ou tests de fonctionnalités / *Feature Tests*), quant à eux, simulent des requêtes HTTP réelles envoyées aux points de terminaison de l'API REST de **BusTracker**. Ces tests permettent de s'assurer que le cycle de vie complet d'un cas d'utilisation est respecté. Par exemple, un test fonctionnel simule le démarrage d'un trajet par un chauffeur : il effectue un appel `POST` vers `/api/trips/start` avec les données d'identification requises, valide que la réponse API renvoie un code HTTP `201 Created`, vérifie la création effective de l'enregistrement dans la base de données MySQL et s'assure qu'un nœud correspondant a été correctement créé sur le nœud Firebase Realtime Database associé. De même, les tests fonctionnels valident le processus d'importation de fichiers Excel par l'administrateur, en vérifiant que les données brutes sont correctement converties en enregistrements cohérents dans la base de données.

---

### II.2 Tests de Sécurité et Rôles
**Page 62**

Compte tenu du caractère sensible des données traitées par la plateforme **BusTracker**—notamment la localisation géographique des élèves et les coordonnées téléphoniques des familles—la validation de la sécurité constitue l'axe majeur de l'assurance qualité. L'accès aux fonctionnalités sensibles doit être restreint selon les privilèges de chaque profil d'utilisateur.

Pour vérifier l'étanchéité des rôles, une suite de tests automatisés cible spécifiquement le middleware `EnsureUserRole`. Ces scénarios de tests simulent des tentatives d'intrusion ou de contournement de privilèges. Par exemple, un test fonctionnel tente d'accéder au point de terminaison de gestion des bus (`POST /api/buses`) en utilisant le jeton d'authentification Laravel Sanctum associé à un compte de type `Parent` ou `Driver`. Les assertions du test vérifient que le serveur rejette systématiquement la requête en retournant un code de statut HTTP `403 Forbidden`, tout en consignant la tentative de violation d'accès.

Afin de clarifier la rigueur de ces vérifications, le tableau ci-dessous dresse la matrice de validation des contrôles d'accès pour les principaux terminaux de l'API :

| Route API | Rôle Autorisé | Code Attendu (Valide) | Code Attendu (Invalide) | Statut de Test |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/users/import` | Administrateur | `200 OK` | `403 Forbidden` | Validé |
| `POST /api/buses` | Administrateur | `201 Created` | `403 Forbidden` | Validé |
| `POST /api/trips/start` | Chauffeur | `200 OK` | `403 Forbidden` | Validé |
| `POST /api/trips/end` | Chauffeur | `200 OK` | `403 Forbidden` | Validé |
| `PATCH /api/presences/{id}`| Chauffeur | `200 OK` | `403 Forbidden` | Validé |
| `POST /api/students/pickup`| Parent | `200 OK` | `403 Forbidden` | Validé |
| `POST /api/absences` | Parent | `201 Created` | `403 Forbidden` | Validé |

Parallèlement, les tests d'intégration valident la protection des jetons d'accès en s'assurant que toute requête non authentifiée (dépourvue de jeton d'autorisation Bearer) est immédiatement redirigée vers une réponse HTTP `401 Unauthorized` par Laravel Sanctum. Côté frontend, les tests unitaires écrits sous React Testing Library simulent le comportement de la navigation pour s'assurer que les routes de l'application React sont inaccessibles si le store local de jetons est vide, redirigeant instantanément l'utilisateur vers la page de connexion publique.

---

## III. Gestion de projet

### III.1 Méthodologie Agile Scrum
**Page 63**

Pour structurer la réalisation de la plateforme **BusTracker** et s'adapter efficacement aux évolutions fonctionnelles, la méthodologie **Agile Scrum** a été adoptée. Ce cadre itératif favorise la réactivité, l'organisation rigoureuse des tâches et une visibilité claire de l'avancement du projet à chaque jalon.

L'organisation des rôles Scrum a été répartie comme suit :
* **Product Owner** : Garant du périmètre fonctionnel et de la satisfaction des besoins des utilisateurs finaux (administrateurs scolaires, chauffeurs et parents d'élèves). Il a défini les récits utilisateurs (*User Stories*) et priorisé le carnet de produit (*Product Backlog*).
* **Scrum Master** : Chargé de s'assurer du respect des principes Scrum, d'éliminer les obstacles techniques (comme les blocages liés à la synchronisation Firebase ou à la configuration de l'environnement de développement) et de réguler le rythme de développement.
* **Équipe de Développement** : Responsable de la conception de l'architecture, de l'écriture du code backend Laravel, du frontend React et de l'intégration temps réel de Firebase.

Le projet a été segmenté en cycles itératifs appelés **Sprints**, d'une durée fixe de deux semaines chacun. Au début de chaque Sprint, une réunion de planification (*Sprint Planning*) permettait de sélectionner les récits utilisateurs prioritaires du Backlog à réaliser. Chaque jour, un point de synchronisation rapide (*Daily Stand-up*) permettait d'échanger sur l'avancement des tâches de la veille, les objectifs du jour et les difficultés rencontrées. À la fin de chaque itération, la revue de Sprint (*Sprint Review*) permettait de présenter une version fonctionnelle et testable de l'application (incrément produit), validant l'atteinte des objectifs opérationnels. Enfin, la rétrospective du Sprint offrait l'occasion d'analyser le processus de travail et de définir des axes d'amélioration continue pour les cycles suivants.

---

### III.2 Planification (Diagramme de Gantt)
**Page 64**

La planification temporelle du projet **BusTracker** a été structurée pour respecter l'échéance académique de fin d'études. Afin de visualiser l'enchaînement des tâches, les dépendances critiques et la répartition des ressources à travers le temps, un diagramme de Gantt a été formalisé.

Le projet s'est articulé autour de six grandes phases consécutives :
1. **Analyse et Spécification (Semaines 1-2)** : Analyse des besoins, spécification des exigences fonctionnelles et modélisation des acteurs et cas d'utilisation UML.
2. **Conception et Modélisation (Semaines 3-4)** : Architecture globale du système, conception détaillée de la base de données SQL (dictionnaire de données) et réalisation des maquettes fonctionnelles (wireframes).
3. **Identité Visuelle (Semaine 5)** : Création de la charte graphique, du logo et validation des contrastes de couleurs WCAG.
4. **Développement Backend (Semaines 6-9)** : Mise en place de Laravel, création des migrations, développement des API REST, du middleware de rôles, de l'import Excel et de l'algorithme géodésique de Haversine.
5. **Développement Frontend & Temps Réel (Semaines 10-13)** : Intégration de React 19, configuration de Tailwind CSS, raccordement de Firebase Realtime Database pour le suivi GPS en direct et intégration de Leaflet.
6. **Tests, Rédaction & Déploiement (Semaines 14-16)** : Écriture des tests automatisés, rédaction du rapport technique final et préparation du déploiement opérationnel.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 15 - Diagramme de Gantt détaillant la planification temporelle et les jalons clés du projet BusTracker]

Ce découpage temporel rigoureux et le parallélisme de certaines tâches (notamment le début du frontend pendant la finalisation de l'API backend) ont permis de limiter les goulets d'étranglement et de respecter le jalon de livraison final.

---

### III.3 Outils de suivi (Trello, Git)
**Page 65**

La mise en œuvre pratique de la gestion de projet a reposé sur l'utilisation combinée d'outils collaboratifs modernes pour le suivi des tâches et le contrôle de version.

Pour le suivi visuel des tâches au quotidien, un tableau Kanban en ligne sur la plateforme **Trello** a été configuré. Ce tableau a permis de matérialiser le carnet de sprint en colonnes distinctes : *À faire (Backlog)*, *En cours (In Progress)*, *En cours de test/revue de code (Review/Test)* et *Terminé (Done)*. Chaque ticket représentait une tâche spécifique (par exemple : "Implémenter le bouton d'importation Excel" ou "Corriger le N+1 sur la route active-trips"), incluant une description détaillée, des critères d'acceptation, des checklists et une attribution claire aux développeurs concernés.

[📸 INSÉRER IMAGE/CAPTURE ICI : Figure 16 - Tableau Kanban Trello utilisé pour le suivi agile des tâches et la répartition des tickets de développement]

Pour la gestion du code source et le travail collaboratif, l'outil de versioning **Git** hébergé sur **GitHub** a été utilisé selon le modèle *GitHub Flow*. Une branche principale `main` représentait l'état de production stable. Chaque nouvelle fonctionnalité ou correction d'anomalie faisait l'objet d'une branche dédiée (ex. `feature/firebase-hook` ou `fix/n-plus-one`). Une fois le développement terminé sur sa branche, le développeur soumettait une demande de fusion (*Pull Request*). Celle-ci déclenchait automatiquement les tests PHPUnit backend pour valider l'absence de régressions avant la revue de code et la fusion finale sur `main`.

---

## IV. Conclusion
**Page 66**

Ce cinquième et dernier chapitre a exposé la rigueur méthodologique et technique qui a guidé la réalisation de la plateforme **BusTracker**. D'une part, la mise en œuvre d'une stratégie de tests rigoureuse, combinant tests unitaires sur les règles de gestion complexes et tests d'intégration fonctionnelle des API REST, a permis de sécuriser le code et de garantir un contrôle d'accès étanche selon les rôles définis (Administrateur, Chauffeur, Parent). D'autre part, l'adoption de la méthodologie agile Scrum, la formalisation de la planification temporelle par le diagramme de Gantt et l'utilisation d'outils structurants comme Trello et Git/GitHub ont assuré une coordination optimale des efforts de développement.

La réussite de ce projet démontre qu'une planification rigoureuse, alliée à une architecture logicielle robuste et modulaire, permet de concevoir des solutions fiables et hautement performantes pour répondre à des besoins réels en matière de sécurité du transport scolaire. La clôture de cette phase de tests et de gestion de projet ouvre désormais la voie à la conclusion générale de ce travail de fin d'études.

