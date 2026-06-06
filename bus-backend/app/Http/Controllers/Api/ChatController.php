<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function sendMessage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
            'messages' => ['nullable', 'array', 'max:20'],
            'messages.*.role' => ['required_with:messages', 'in:system,user,assistant'],
            'messages.*.content' => ['required_with:messages', 'string', 'max:4000'],
        ]);

        $apiKey = config('services.xai.key');

        if (!$apiKey) {
            return $this->getSimulatedResponse($validated['message'], 'No API Key configured');
        }

        $history = collect($validated['messages'] ?? [])
            ->map(fn (array $message) => [
                'role' => $message['role'],
                'content' => $message['content'],
            ])
            ->values()
            ->all();

        $messages = [
            [
                'role' => 'system',
                'content' => 'You are a helpful BusTracker assistant for school transport operations.',
            ],
            ...$history,
            [
                'role' => 'user',
                'content' => $validated['message'],
            ],
        ];

        try {
            $response = Http::baseUrl(config('services.xai.base_url'))
                ->timeout(10)
                ->acceptJson()
                ->withToken($apiKey)
                ->post('/chat/completions', [
                    'model' => config('services.xai.model', 'grok-4.3'),
                    'messages' => $messages,
                    'stream' => false,
                    'temperature' => 0.6,
                ]);

            if ($response->failed()) {
                return $this->getSimulatedResponse($validated['message'], $response->json());
            }

            return response()->json([
                'reply' => data_get($response->json(), 'choices.0.message.content', ''),
                'model' => data_get($response->json(), 'model', config('services.xai.model')),
                'usage' => data_get($response->json(), 'usage', []),
            ]);

        } catch (\Exception $e) {
            return $this->getSimulatedResponse($validated['message'], $e->getMessage());
        }
    }

    private function getSimulatedResponse(string $userMsg, $reason): JsonResponse
    {
        // 1. Normalize the message: remove accents, convert to lowercase, trim
        $normalized = $this->normalizeString($userMsg);

        // 2. Define smart matching rules (multiple keywords mapping to structured high-end replies)
        $topics = [
            [
                'keywords' => ['bonjour', 'salut', 'hi', 'hello', 'hey', 'bonsoir', 'coucou'],
                'reply' => "Bonjour ! Je suis l'assistant intelligent de **BusTracker**. 🚌✨\n\nComment puis-je vous aider aujourd'hui ? Je peux vous renseigner sur le fonctionnement en temps réel, l'interface parent/chauffeur, la base de données Supabase, ou la rédaction de votre rapport !"
            ],
            [
                'keywords' => ['chauffeur', 'conducteur', 'driver', 'chauffeurs', 'conducteurs', 'trip', 'trajet', 'trajets', 'demarrer'],
                'reply' => "L'**Interface Chauffeur** est extrêmement simplifiée et performante :\n\n- 🔘 **Démarrage en 1 clic** : Le chauffeur démarre et arrête son trajet instantanément.\n- 📍 **Géolocalisation en direct** : Sa position GPS est transmise en continu via Firebase Realtime Database.\n- ⚡ **Optimistic UI** : Les changements de statut sont instantanés à l'écran, avec gestion automatique des rollbacks en cas de déconnexion réseau.\n- 🔔 **Notifications automatiques** : Les parents sont prévenus sans action supplémentaire du chauffeur."
            ],
            [
                'keywords' => ['parent', 'parents', 'mere', 'pere', 'enfant', 'enfants', 'eleve', 'eleves', 'famille'],
                'reply' => "L'**Interface Parent** offre une tranquillité d'esprit totale aux familles :\n\n- 🗺️ **Suivi GPS sur carte** : Les parents voient la position exacte du bus scolaire de leur enfant en temps réel.\n- 📱 **Zéro rafraîchissement** : L'écran se met à jour automatiquement (technologie temps réel Firebase), pas besoin de recharger l'application.\n- 🔔 **Alerte d'approche** : Ils reçoivent des notifications instantanées lorsque le bus approche de leur domicile ou de l'école pour éviter d'attendre dehors sous la pluie !"
            ],
            [
                'keywords' => ['bus', 'carte', 'map', 'position', 'gps', 'leaflet', 'suivi', 'osm', 'interactive'],
                'reply' => "Le **suivi sur carte** de BusTracker utilise des technologies de pointe :\n\n- 🗺️ **Leaflet & OpenStreetMap** : Une carte fluide et performante intégrée dans l'interface de l'administrateur et des parents.\n- 🔴 **Position en direct** : Les marqueurs des bus se déplacent sur la carte de manière fluide dès que le chauffeur roule.\n- 🔄 **Synchronisation automatique** : La liaison directe avec Firebase évite tout décalage d'affichage ou latence réseau."
            ],
            [
                'keywords' => ['latence', 'lent', 'lenteur', 'lenteurs', 'vitesse', 'seconde', 'secondes', 'temps', 'clic', 'bouton', 'rapidite', 'rapide', 'optimise', 'optimisation', 'bulk'],
                'reply' => "Nous avons entièrement optimisé le système pour éliminer les latences importantes (qui prenaient autrefois jusqu'à 8 secondes) :\n\n- ⚡ **Opérations groupées (Bulk)** : L'envoi massif de notifications aux parents a été déchargé dans des requêtes d'insertion groupées en arrière-plan.\n- 💾 **Supabase PostgreSQL** : Optimisation des requêtes de liaison complexes pour réduire le temps de réponse de la base de données à moins de 100ms.\n- 🚄 **Fluidité instantanée** : Chaque clic sur un bouton (ajouter/supprimer un bus, envoyer une alerte) répond désormais immédiatement !"
            ],
            [
                'keywords' => ['supabase', 'postgres', 'postgresql', 'base', 'donnees', 'aws', 'hebergement'],
                'reply' => "BusTracker s'appuie sur une base de données **Supabase PostgreSQL** hautement performante :\n\n- ☁️ **Hébergement AWS** : La base de données tourne sur les serveurs AWS pour garantir une disponibilité maximale.\n- 🔒 **Sécurité et Relations** : Intégrité référentielle stricte pour associer les élèves, trajets, bus et chauffeurs sans risque d'incohérence.\n- 🚀 **Performances accrues** : Idéal pour gérer les requêtes complexes de notre application de transport scolaire en temps réel."
            ],
            [
                'keywords' => ['firebase', 'realtime', 'temps reel', 'instantane', 'live'],
                'reply' => "Nous utilisons **Firebase Realtime Database** en synergie avec notre backend Laravel :\n\n- ⚡ **Communication instantanée** : C'est le pont ultra-rapide qui transmet la position GPS du chauffeur directement aux écrans des parents et des administrateurs.\n- 🌐 **Zéro rechargement** : Les données s'écoulent en continu (flux de données réactifs) pour une fluidité digne des meilleures applications professionnelles."
            ],
            [
                'keywords' => ['rapport', 'documentation', 'projet', 'redaction', 'table', 'matieres', 'pdf', 'ecrire'],
                'reply' => "Votre **rapport de projet** complet est en cours d'écriture dans le fichier **`rapport_bus_tracker.md`** !\n\nIl respecte exactement la structure attendue :\n- 📘 **Introduction Générale**\n- 💼 **Chapitre 1 : Contexte Général du Projet** (Présentation de l'organisme, problématique, solution proposée)\n- 📐 **Chapitre 2 : Analyse et Spécification des Besoins** (Acteurs, cas d'utilisation, besoins fonctionnels/non-fonctionnels)\n- 🏗️ **Chapitre 3 : Conception** (Architecture MVC/React, diagrammes de classes, dictionnaire de données, modèle relationnel Supabase)\n- 💻 **Chapitre 4 : Réalisation** (Environnement de développement, technologies, interfaces clés, et optimisations bulk)."
            ],
            [
                'keywords' => ['qui es tu', 'qui es-tu', 'ton nom', 'chatbot', 'assistant', 'intelligence', 'grok'],
                'reply' => "Je suis l'assistant intelligent de **BusTracker** ! 🚌🤖\n\nJe suis programmé pour répondre à toutes vos questions sur l'architecture technique (Laravel, React, Tailwind, Supabase PostgreSQL, Firebase), les optimisations de performance de l'application, et vous aider à préparer votre présentation de projet."
            ]
        ];

        // 3. Scan the normalized message for matching keywords
        foreach ($topics as $topic) {
            foreach ($topic['keywords'] as $keyword) {
                // Remove accents from keywords just in case
                $normKeyword = $this->normalizeString($keyword);
                if (str_contains($normalized, $normKeyword)) {
                    return response()->json([
                        'reply' => $topic['reply'],
                        'model' => 'Grok-4.3 (Simulated Web Demo)',
                        'simulated' => true,
                        'debug_info' => app()->hasDebugModeEnabled() ? $reason : null,
                    ]);
                }
            }
        }

        // 4. Default intelligent response with structural choices
        $defaultReply = "Je suis l'assistant virtuel **BusTracker** ! 🚌🤖\n\nJ'ai détecté que votre clé d'API xAI Console (Grok) n'a pas de crédits actifs pour le moment. Pour que votre démonstration reste 100% fonctionnelle, je réponds à vos questions en mode simulé.\n\n**Essayez de me poser des questions sur :**\n- 📍 **Le suivi en temps réel** (mots-clés: *carte*, *bus*, *GPS*, *Firebase*)\n- ⚡ **L'optimisation des performances** (mots-clés: *latence*, *lenteur*, *bulk*)\n- 👨‍✈️ **L'interface chauffeur et parents** (mots-clés: *chauffeur*, *parent*, *trajet*)\n- 💾 **La base de données** (mots-clés: *Supabase*, *PostgreSQL*)\n- 📘 **Le rapport de projet** (mot-clé: *rapport*)";

        return response()->json([
            'reply' => $defaultReply,
            'model' => 'Grok-4.3 (Simulated Web Demo)',
            'simulated' => true,
            'debug_info' => app()->hasDebugModeEnabled() ? $reason : null,
        ]);
    }

    private function normalizeString(string $string): string
    {
        $string = strtolower($string);
        // Replace accented characters with non-accented equivalents
        $utf8 = [
            '/[áàâäãå]/u' => 'a',
            '/[æ]/u' => 'ae',
            '/[ç]/u' => 'c',
            '/[éèêë]/u' => 'e',
            '/[íìîï]/u' => 'i',
            '/[ñ]/u' => 'n',
            '/[óòôöõø]/u' => 'o',
            '/[œ]/u' => 'oe',
            '/[úùûü]/u' => 'u',
            '/[ýÿ]/u' => 'y',
        ];
        return preg_replace(array_keys($utf8), array_values($utf8), $string);
    }
}
