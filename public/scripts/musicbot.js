

async function test(message) {
    const res = await fetch("/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
    });

    const data = await res.json();
    return data.choices[0].message.content;
}

async function musicBot(thisSong) {
    let musicBotEl = document.getElementById("musicBot");
    musicBotEl.innerHTML = "Finding similar Songs...";
    const reply = await test(`Gimme 10 close song recommendations by Song title and artist each song seperated by a comma. For example "goosebumps Travis Scott,". Song: ${thisSong.title} by ${thisSong.artist}. Dont say anything other then the recommendations`);

    musicBotEl.innerHTML = "Song Recommendations:<br>";
    const cleaned = reply.replace(/\*\*/g, "").replace(/\*/g, "").replace(/—/g, "-");
    const recommendations = cleaned.split(",").map(r => r.trim()).filter(r => r.length > 0);

    for (let i = 0; i < recommendations.length; i++) {
        await new Promise(r => setTimeout(r, 150));

        let rec = document.createElement("div");
        rec.innerHTML = recommendations[i];
        rec.classList.add("songRec");
        rec.onclick = async () => {
            document.getElementById("search-input").value = recommendations[i];
            await showResults();
        }

        musicBotEl.appendChild(rec);
    }

    return recommendations; // array of recommendation strings
}
