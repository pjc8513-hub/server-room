export class TextGenerator {
    constructor() {
        this.nouns = ["void", "workstation", "book", "ghost", "viper", "child", "star", "hollow", "dream", "web", "shadow", "vault"];
        this.verbs = ["walks", "echoes", "floats", "whispers", "shivers", "fades", "glitters", "remains", "feeds", "names"];
        this.adjectives = ["unwalled", "infinite", "chilly", "dark", "sleek", "mute", "fragile", "dull", "luminous", "vast"];
    }

    generateNoise(length = 20) {
        let text = "";
        for (let i = 0; i < length; i++) {
            const r = Math.random();
            if (r < 0.3) text += this.getRandom(this.adjectives) + " ";
            else if (r < 0.6) text += this.getRandom(this.nouns) + " ";
            else text += this.getRandom(this.verbs) + " ";

            if (Math.random() < 0.1) text += ". ";
        }
        return text.trim();
    }

    getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}
