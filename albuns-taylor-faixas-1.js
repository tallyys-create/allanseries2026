(() => {
const T={
"debut":"Tim McGraw|Picture to Burn|Teardrops on My Guitar|A Place in This World|Cold as You|The Outside|Tied Together with a Smile|Stay Beautiful|Should've Said No|Mary's Song (Oh My My My)|Our Song",
"fearless":"Fearless|Fifteen|Love Story|Hey Stephen|White Horse|You Belong with Me|Breathe (feat. Colbie Caillat)|Tell Me Why|You're Not Sorry|The Way I Loved You|Forever & Always|The Best Day|Change",
"speak-now":"Mine|Sparks Fly|Back to December|Speak Now|Dear John|Mean|The Story of Us|Never Grow Up|Enchanted|Better than Revenge|Innocent|Haunted|Last Kiss|Long Live",
"red":"State of Grace|Red|Treacherous|I Knew You Were Trouble.|All Too Well|22|I Almost Do|We Are Never Ever Getting Back Together|Stay Stay Stay|The Last Time (feat. Gary Lightbody)|Holy Ground|Sad Beautiful Tragic|The Lucky One|Everything Has Changed (feat. Ed Sheeran)|Starlight|Begin Again",
"1989":"Welcome to New York|Blank Space|Style|Out of the Woods|All You Had to Do Was Stay|Shake It Off|I Wish You Would|Bad Blood|Wildest Dreams|How You Get the Girl|This Love|I Know Places|Clean"
};
for(const [id,v] of Object.entries(T)){const a=window.TAYLOR_ALBUMS.find(a=>a.id===id);if(a)a.tracks=v.split("|");}
})();