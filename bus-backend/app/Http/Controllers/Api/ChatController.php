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
                'reply' => "Bonjour ! Je suis l'assistant intelligent de **BusTracker**. 🚌✨\n\nComment puis-je vous aider aujourd'hui ? Je peux vous renseigner sur le suivi en temps réel, les interfaces parent/chauffeur/admin, Firebase Realtime Database, ou l'architecture Laravel + React de l'application."
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
                'reply' => "BusTracker optimise les flux critiques pour garder l'interface réactive :\n\n- ⚡ **Realtime Firebase** : Les positions et l'état du trajet actif sont diffusés sans rechargement.\n- 💾 **Laravel + Eloquent** : Les opérations métier restent côté API pour conserver les contrôles de rôle, d'école et de validation.\n- 🔔 **Notifications applicatives** : Les événements importants sont enregistrés en base et peuvent être relayés via le service WebSocket local."
            ],
            [
                'keywords' => ['supabase', 'postgres', 'postgresql', 'base', 'donnees', 'aws', 'hebergement'],
                'reply' => "Dans ce projet, les données métier de BusTracker sont servies par un backend **Laravel** avec des modèles **Eloquent** et une base relationnelle configurée côté Laravel, MySQL en développement d'après la configuration du dépôt.\n\nFirebase Realtime Database est utilisé séparément pour les données live de trajet et de localisation."
            ],
            [
                'keywords' => ['firebase', 'realtime', 'temps reel', 'instantane', 'live'],
                'reply' => "Nous utilisons **Firebase Realtime Database** en synergie avec notre backend Laravel :\n\n- ⚡ **Communication instantanée** : C'est le pont ultra-rapide qui transmet la position GPS du chauffeur directement aux écrans des parents et des administrateurs.\n- 🌐 **Zéro rechargement** : Les données s'écoulent en continu (flux de données réactifs) pour une fluidité digne des meilleures applications professionnelles."
            ],
            [
                'keywords' => ['rapport', 'documentation', 'projet', 'redaction', 'table', 'matieres', 'pdf', 'ecrire'],
                'reply' => "Je peux vous aider à expliquer ou structurer la documentation de BusTracker : contexte du transport scolaire, rôles utilisateur, architecture Laravel API + React/Vite, Firebase Realtime Database, règles de sécurité, et principaux flux métier comme le démarrage/finalisation des trajets."
            ],
            [
                'keywords' => ['qui es tu', 'qui es-tu', 'ton nom', 'chatbot', 'assistant', 'intelligence', 'grok'],
                'reply' => "Je suis l'assistant intelligent de **BusTracker** ! 🚌🤖\n\nJe peux répondre aux questions sur l'architecture technique Laravel, React/Vite, Tailwind, Firebase Realtime Database, les rôles utilisateur, et les flux de transport scolaire."
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
        $defaultReply = "Je suis l'assistant virtuel **BusTracker** ! 🚌🤖\n\nL'assistant IA externe n'est pas disponible pour le moment, donc je réponds en mode simulé avec les informations du projet.\n\n**Essayez de me poser des questions sur :**\n- 📍 **Le suivi en temps réel** (mots-clés: *carte*, *bus*, *GPS*, *Firebase*)\n- ⚡ **Les performances et notifications** (mots-clés: *latence*, *lenteur*, *notifications*)\n- 👨‍✈️ **L'interface chauffeur et parents** (mots-clés: *chauffeur*, *parent*, *trajet*)\n- 💾 **La base de données Laravel/Eloquent** (mots-clés: *base*, *données*, *MySQL*)\n- 🧭 **L'architecture du projet** (mots-clés: *architecture*, *React*, *Laravel*)";

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
