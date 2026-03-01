export class AudioManager {
    constructor() {
        this.tracks = [
            'audio/Colossus.mp3',
            'audio/Void_Echoes.mp3'
        ];
        this.currentAudio = null;
        this.probability = 0.1; // 10% chance to play
    }

    /**
     * Attempts to play a random atmospheric track at half tempo.
     * Only plays if no atmospheric track is currently active.
     */
    playAtmosphericAudio() {
        // If already playing something, don't start a new one
        if (this.currentAudio && !this.currentAudio.paused) {
            return;
        }

        // Probability check
        if (Math.random() > this.probability) {
            return;
        }

        const trackPath = this.tracks[Math.floor(Math.random() * this.tracks.length)];

        try {
            const audio = new Audio(trackPath);
            audio.playbackRate = 0.5; // Half tempo
            audio.volume = 0.05; // Subtle volume

            audio.play().then(() => {
                this.currentAudio = audio;
                console.log(`[AudioManager] Playing atmospheric track: ${trackPath} at 0.5x speed`);
            }).catch(err => {
                console.warn('[AudioManager] Failed to play audio:', err);
            });

            // Cleanup when track ends
            audio.onended = () => {
                this.currentAudio = null;
            };
        } catch (e) {
            console.error('[AudioManager] Error initializing Audio:', e);
        }
    }
}
