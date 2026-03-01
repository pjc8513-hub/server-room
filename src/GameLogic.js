export class GameLogic {
    constructor() {
        this.pages = [];
        this.currentIndex = 0;
        this.seenPages = new Set();
        this.narrativePositions = new Map(); // key "x,z" to page index
        this.dialogue = [];
    }

    async loadPages() {
        try {
            const response = await fetch('./pages.json');
            this.pages = await response.json();
            console.log(`Loaded ${this.pages.length} pages.`);
        } catch (error) {
            console.error('Failed to load pages.json:', error);
            this.pages = [{ content: "The book is empty.", page: 0 }];
        }

        try {
            const response = await fetch('./dialogue.json');
            this.dialogue = await response.json();
            console.log(`Loaded ${this.dialogue.length} dialogue items.`);
        } catch (error) {
            console.error('Failed to load dialogue.json:', error);
            this.dialogue = [{ content: "...", id: 0 }];
        }
    }

    /**
     * Returns a stable narrative page for a given grid position.
     * The same position always returns the same page.
     */
    getNarrativePage(x, z) {
        const key = `${x},${z}`;
        if (this.narrativePositions.has(key)) {
            return this.pages[this.narrativePositions.get(key)];
        }
        const index = this.currentIndex % this.pages.length;
        this.narrativePositions.set(key, index);
        this.currentIndex++;
        const page = this.pages[index];
        this.seenPages.add(page.page);
        return page;
    }

    /**
     * Returns a random page from the loaded list.
     * Used for the 50/50 novel-vs-noise roll at click time.
     */
    getRandomPage() {
        if (this.pages.length === 0) return { content: "The book is empty.", page: 0 };
        const index = Math.floor(Math.random() * this.pages.length);
        return this.pages[index];
    }

    /**
     * Returns a random dialogue entry from dialogue.json
     */
    getRandomDialogue() {
        if (this.dialogue.length === 0) return { content: "...", id: 0 };
        const index = Math.floor(Math.random() * this.dialogue.length);
        return this.dialogue[index];
    }
}
