document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const stories = [
        { id: 1, title: "Le Petit Chaperon Rouge", file: "stories/histoire1.txt" },
        { id: 2, title: "Les Trois Petits Cochons", file: "stories/histoire2.txt" },
        { id: 3, title: "Le Chat Botté", file: "stories/histoire3.txt" },
        { id: 4, title: "Cendrillon", file: "stories/histoire4.txt" },
        { id: 5, title: "La Belle au Bois Dormant", file: "stories/histoire5.txt" },
        { id: 6, title: "Blanche-Neige", file: "stories/histoire6.txt" },
        { id: 7, title: "Hansel et Gretel", file: "stories/histoire7.txt" },
        { id: 8, title: "Boucle d'Or et les Trois Ours", file: "stories/histoire8.txt" },
        { id: 9, title: "Le Vilain Petit Canard", file: "stories/histoire9.txt" },
        { id: 10, title: "La Petite Sirène", file: "stories/histoire10.txt" },
        // Ajoutez vos 10 histoires ici
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

    // --- Initialisation ---

    // Vérifier la compatibilité de SpeechSynthesis
    if (!('speechSynthesis' in window)) {
        alert("Désolé, votre navigateur ne supporte pas la synthèse vocale.");
        return;
    }

    // Charger les voix disponibles (peut prendre un peu de temps)
    function populateVoiceList() {
        voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = ''; // Vider la liste existante
        if (voices.length === 0) {
             voiceSelect.innerHTML = '<option>Aucune voix trouvée</option>';
             voiceSelect.disabled = true;
             return; // Sortir si aucune voix n'est trouvée immédiatement
        }

        voices.forEach((voice, i) => {
            // Filtrer pour les voix françaises si possible
            if (voice.lang.startsWith('fr')) {
                 const option = document.createElement('option');
                 option.textContent = `${voice.name} (${voice.lang})`;
                 option.setAttribute('data-lang', voice.lang);
                 option.setAttribute('data-name', voice.name);
                 voiceSelect.appendChild(option);
            }
        });
         // Si aucune voix française n'est trouvée, afficher un message ou toutes les voix
        if (voiceSelect.options.length === 0) {
             voiceSelect.innerHTML = '<option>Aucune voix française trouvée</option>';
             // Alternative: afficher toutes les voix disponibles
             /*
             voices.forEach((voice, i) => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.setAttribute('data-lang', voice.lang);
                option.setAttribute('data-name', voice.name);
                voiceSelect.appendChild(option);
             });
             */
        }
        voiceSelect.disabled = false;
    }

    // L'événement 'voiceschanged' est crucial car les voix ne sont pas toujours disponibles immédiatement
    speechSynthesis.onvoiceschanged = populateVoiceList;
    populateVoiceList(); // Essayer de peupler immédiatement au cas où


    // Créer les boutons pour chaque histoire
    stories.forEach(story => {
        const button = document.createElement('button');
        button.textContent = story.title;
        button.dataset.file = story.file; // Stocke le chemin du fichier dans un attribut data-*
        button.dataset.title = story.title;
        button.addEventListener('click', handleStorySelection);
        storyListElement.appendChild(button);
    });


    // --- Fonctions ---

    // Gérer la sélection d'une histoire
    async function handleStorySelection(event) {
        const selectedButton = event.target;
        const storyFile = selectedButton.dataset.file;
        currentStoryTitle = selectedButton.dataset.title;

        // Mettre en évidence le bouton sélectionné (optionnel)
        document.querySelectorAll('#story-list button').forEach(btn => btn.classList.remove('selected'));
        selectedButton.classList.add('selected');


        // Arrêter la lecture en cours si une nouvelle histoire est sélectionnée
        if (speechSynthesis.speaking || speechSynthesis.paused) {
            speechSynthesis.cancel();
        }
        resetControls();


        // Charger le texte de l'histoire
        try {
            storyContentElement.textContent = "Chargement...";
            const response = await fetch(storyFile);
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            currentStoryText = await response.text();
            storyContentElement.textContent = currentStoryText; // Afficher le texte
            playButton.disabled = false; // Activer le bouton Lire
        } catch (error) {
            console.error("Erreur lors du chargement de l'histoire:", error);
            storyContentElement.textContent = "Impossible de charger l'histoire.";
            currentStoryText = '';
            playButton.disabled = true;
        }
    }

    // Démarrer ou reprendre la lecture
    function playStory() {
        if (!currentStoryText) return; // Ne rien faire si aucun texte n'est chargé

        if (speechSynthesis.paused && utterance) {
            // Reprendre la lecture si elle était en pause
            speechSynthesis.resume();
            updateControlsOnPlay();
        } else if (!speechSynthesis.speaking) {
             // Créer un nouvel objet SpeechSynthesisUtterance
            utterance = new SpeechSynthesisUtterance(currentStoryText);

             // Sélectionner la voix choisie
             const selectedVoiceName = voiceSelect.selectedOptions[0]?.getAttribute('data-name');
             if (selectedVoiceName) {
                 utterance.voice = voices.find(voice => voice.name === selectedVoiceName);
             } else {
                 // Essayer de trouver une voix française par défaut si aucune n'est sélectionnée
                 utterance.voice = voices.find(voice => voice.lang.startsWith('fr') && voice.default) || voices.find(voice => voice.lang.startsWith('fr'));
             }
             utterance.lang = utterance.voice ? utterance.voice.lang : 'fr-FR'; // Définir la langue

            // Gérer la fin de la lecture
            utterance.onend = () => {
                console.log("Lecture terminée.");
                resetControls();
            };

            // Gérer les erreurs de lecture
            utterance.onerror = (event) => {
                console.error("Erreur de synthèse vocale:", event.error);
                resetControls();
                storyContentElement.textContent += "\n\nErreur de lecture.";
            };

            // Commencer la lecture
            speechSynthesis.speak(utterance);
            updateControlsOnPlay();
        }
    }

    // Mettre en pause la lecture
    function pauseStory() {
        if (speechSynthesis.speaking) {
            speechSynthesis.pause();
            updateControlsOnPause();
        }
    }

    // Arrêter la lecture
    function stopStory() {
        if (speechSynthesis.speaking || speechSynthesis.paused) {
            speechSynthesis.cancel(); // Annule la lecture en cours
        }
        resetControls();
    }

    // Mettre à jour l'état des boutons lors de la lecture
    function updateControlsOnPlay() {
        playButton.disabled = true;
        pauseButton.disabled = false;
        stopButton.disabled = false;
    }

     // Mettre à jour l'état des boutons lors de la pause
    function updateControlsOnPause() {
        playButton.disabled = false; // Le bouton "Lire" sert maintenant à "Reprendre"
        pauseButton.disabled = true;
        stopButton.disabled = false;
    }

     // Réinitialiser l'état des boutons (après arrêt ou fin)
    function resetControls() {
         playButton.disabled = !currentStoryText; // Activer seulement si une histoire est chargée
         pauseButton.disabled = true;
         stopButton.disabled = true;
         utterance = null; // Important de réinitialiser l'utterance
    }


    // --- Écouteurs d'événements pour les contrôles ---
    playButton.addEventListener('click', playStory);
    pauseButton.addEventListener('click', pauseStory);
    stopButton.addEventListener('click', stopStory);

}); // Fin de DOMContentLoaded