document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // On ne liste plus que les fichiers, les titres seront extraits
    const storyFiles = [
        "stories/histoire1.txt",
        "stories/histoire2.txt",
        "stories/histoire3.txt",
        "stories/histoire4.txt",
        "stories/histoire5.txt",
        "stories/histoire6.txt",
        "stories/histoire7.txt",
        "stories/histoire8.txt",
        "stories/histoire9.txt",
        // Ajoutez les chemins vers vos 10 fichiers ici
    ];

    // --- Éléments DOM ---
    const storyListElement = document.getElementById('story-list');
    const storyContentElement = document.getElementById('story-content');
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');
    const stopButton = document.getElementById('stop-button');
    const voiceSelect = document.getElementById('voice-select');

    // --- Variables d'état ---
    let currentStoryText = '';
    let currentStoryTitle = '';
    let utterance = null;
    let voices = [];
    let loadedStoriesData = {}; // Pour stocker les données chargées (titre, contenu) par fichier

    // --- Initialisation ---

    // Vérifier la compatibilité de SpeechSynthesis
    if (!('speechSynthesis' in window)) {
        alert("Désolé, votre navigateur ne supporte pas la synthèse vocale.");
        return;
    }

    // Charger les voix disponibles
    function populateVoiceList() {
        // ... (Le code de populateVoiceList reste identique à l'exemple précédent) ...
        voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = ''; // Vider la liste existante
        if (voices.length === 0) {
             voiceSelect.innerHTML = '<option>Aucune voix trouvée</option>';
             voiceSelect.disabled = true;
             return;
        }

        voices.forEach((voice, i) => {
            if (voice.lang.startsWith('fr')) {
                 const option = document.createElement('option');
                 option.textContent = `${voice.name} (${voice.lang})`;
                 option.setAttribute('data-lang', voice.lang);
                 option.setAttribute('data-name', voice.name);
                 voiceSelect.appendChild(option);
            }
        });
        if (voiceSelect.options.length === 0) {
             voiceSelect.innerHTML = '<option>Aucune voix française trouvée</option>';
        }
        voiceSelect.disabled = false;
    }

    speechSynthesis.onvoiceschanged = populateVoiceList;
    populateVoiceList();


    // --- Nouvelle Fonction : Charger les histoires et construire la liste ---
    async function loadStoriesAndBuildList() {
        storyListElement.innerHTML = '<p>Chargement des histoires...</p>'; // Message de chargement

        try {
            // 1. Créer un tableau de promesses pour fetcher tous les fichiers
            const fetchPromises = storyFiles.map(file => fetch(file));

            // 2. Attendre que tous les fetchs soient terminés
            const responses = await Promise.all(fetchPromises);

            // 3. Vérifier si toutes les réponses sont OK
            for (const response of responses) {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status} pour ${response.url}`);
                }
            }

            // 4. Créer un tableau de promesses pour lire le texte de chaque réponse
            const textPromises = responses.map(response => response.text());

            // 5. Attendre que tous les textes soient lus
            const texts = await Promise.all(textPromises);

            // 6. Traiter chaque texte pour extraire le titre et le contenu
            storyListElement.innerHTML = ''; // Vider le message de chargement
            texts.forEach((fullText, index) => {
                const filePath = storyFiles[index];
                let title = `Histoire ${index + 1}`; // Titre par défaut
                let content = fullText;

                // Extraire la première ligne comme titre
                const firstNewlineIndex = fullText.indexOf('\n');
                if (firstNewlineIndex !== -1) {
                    title = fullText.substring(0, firstNewlineIndex).trim();
                    content = fullText.substring(firstNewlineIndex + 1).trim(); // Contenu après la 1ère ligne
                } else {
                    // Si pas de saut de ligne, on prend tout comme titre (ou comme contenu ?) - A ajuster
                    title = fullText.trim(); // Option 1: Tout est le titre
                    content = "";         // Option 1: Pas de contenu
                    // content = fullText.trim(); // Option 2: Tout est le contenu, titre par défaut
                }

                 // Gérer le cas où le titre extrait est vide
                 if (!title) {
                    title = `Histoire ${index + 1} (sans titre)`;
                 }

                // Stocker les données chargées
                loadedStoriesData[filePath] = { title: title, content: content };

                // Créer le bouton pour l'histoire
                const button = document.createElement('button');
                button.textContent = title; // Utiliser le titre extrait
                button.dataset.file = filePath; // Stocke le chemin du fichier
                button.addEventListener('click', handleStorySelection);
                storyListElement.appendChild(button);
            });

        } catch (error) {
            console.error("Erreur lors du chargement des histoires:", error);
            storyListElement.innerHTML = '<p>Impossible de charger la liste des histoires.</p>';
        }
    }


    // --- Fonctions ---

    // Gérer la sélection d'une histoire (MISE A JOUR)
    function handleStorySelection(event) {
        const selectedButton = event.target;
        const storyFile = selectedButton.dataset.file;

        // Récupérer les données pré-chargées
        const storyData = loadedStoriesData[storyFile];

        if (!storyData) {
            console.error("Données non trouvées pour", storyFile);
            storyContentElement.textContent = "Erreur : Impossible de trouver les données de l'histoire.";
            resetControls();
            playButton.disabled = true;
            return;
        }

        currentStoryText = storyData.content;
        currentStoryTitle = storyData.title;

        // Mettre en évidence le bouton sélectionné (optionnel)
        document.querySelectorAll('#story-list button').forEach(btn => btn.classList.remove('selected'));
        selectedButton.classList.add('selected');

        // Arrêter la lecture en cours
        if (speechSynthesis.speaking || speechSynthesis.paused) {
            speechSynthesis.cancel();
        }
        resetControls();

        // Afficher le texte de l'histoire (le contenu sans le titre)
        storyContentElement.textContent = currentStoryText || "(Cette histoire n'a pas de contenu textuel après le titre)";
        playButton.disabled = !currentStoryText; // Activer Lire seulement si y'a du contenu

    }

    // Démarrer ou reprendre la lecture (Identique, mais utilise currentStoryText et currentStoryTitle mis à jour)
    function playStory() {
         // ... (Le code de playStory reste identique à l'exemple précédent) ...
         // Il utilisera automatiquement les valeurs de `currentStoryText`
         // et `currentStoryTitle` qui ont été mises à jour par `handleStorySelection`.
        if (!currentStoryText) return;

        if (speechSynthesis.paused && utterance) {
            speechSynthesis.resume();
            updateControlsOnPlay();
        } else if (!speechSynthesis.speaking) {
            utterance = new SpeechSynthesisUtterance(currentStoryText);

            const selectedVoiceName = voiceSelect.selectedOptions[0]?.getAttribute('data-name');
            if (selectedVoiceName) {
                utterance.voice = voices.find(voice => voice.name === selectedVoiceName);
            } else {
                utterance.voice = voices.find(voice => voice.lang.startsWith('fr') && voice.default) || voices.find(voice => voice.lang.startsWith('fr'));
            }
            utterance.lang = utterance.voice ? utterance.voice.lang : 'fr-FR';

            utterance.onend = () => {
                console.log("Lecture terminée.");
                resetControls();
            };

            utterance.onerror = (event) => {
                console.error("Erreur de synthèse vocale:", event.error);
                resetControls();
                storyContentElement.textContent += "\n\nErreur de lecture.";
            };

            speechSynthesis.speak(utterance);
            updateControlsOnPlay();
        }
    }

    function pauseStory()
    {
    console.log("Pause button clicked!"); // <<< AJOUTER CECI
    if (speechSynthesis.speaking) {
        console.log("Synthèse en cours, mise en pause..."); // <<< AJOUTER CECI (optionnel)
        speechSynthesis.pause();
        updateControlsOnPause();
    } else {
        // Optionnel: voir pourquoi on pense que ce n'est pas en train de parler
        console.log("Pause clicked, but speechSynthesis.speaking is false.");
    }

    // Arrêter la lecture (Identique)
    function stopStory() {
        // ... (Identique) ...
        if (speechSynthesis.speaking || speechSynthesis.paused) {
            speechSynthesis.cancel();
        }
        resetControls();
    }

     // Fonctions de mise à jour des contrôles (Identiques)
    function updateControlsOnPlay() { /* ... */ }
    function updateControlsOnPause() { /* ... */ }
    function resetControls() { /* ... (sauf la condition sur playButton) */
        playButton.disabled = !currentStoryText; // Activer seulement si une histoire est chargée ET a du contenu
        pauseButton.disabled = true;
        stopButton.disabled = true;
        utterance = null;
    }


    // --- Écouteurs d'événements pour les contrôles ---
    playButton.addEventListener('click', playStory);
    pauseButton.addEventListener('click', pauseStory);
    stopButton.addEventListener('click', stopStory);

    // --- Appel Initial pour charger les histoires ---
    loadStoriesAndBuildList();


}); // Fin de DOMContentLoaded
