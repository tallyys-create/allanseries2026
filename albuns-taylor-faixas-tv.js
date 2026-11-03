(() => {
const get=id=>window.TAYLOR_ALBUMS.find(a=>a.id===id);
const extra={
"fearless-tv":"Jump Then Fall|Untouchable|Forever & Always (Piano Version)|Come In With the Rain|Superstar|The Other Side of the Door|Today Was a Fairytale|You All Over Me (feat. Maren Morris)|Mr. Perfectly Fine|We Were Happy|That's When (feat. Keith Urban)|Don't You|Bye Bye Baby",
"red-tv":"The Moment I Knew|Come Back... Be Here|Girl at Home|State of Grace (Acoustic Version)|Ronan|Better Man|Nothing New (feat. Phoebe Bridgers)|Babe|Message in a Bottle|I Bet You Think About Me (feat. Chris Stapleton)|Forever Winter|Run (feat. Ed Sheeran)|The Very First Night|All Too Well (10 Minute Version)",
"speak-now-tv":"Ours|Superman|Electric Touch (feat. Fall Out Boy)|When Emma Falls in Love|I Can See You|Castles Crumbling (feat. Hayley Williams)|Foolish One|Timeless",
"1989-tv":"Wonderland|You Are in Love|New Romantics|Slut!|Say Don't Go|Now That We Don't Talk|Suburban Legends|Is It Over Now?"
};
const base={"fearless-tv":"fearless","red-tv":"red","speak-now-tv":"speak-now","1989-tv":"1989"};
Object.entries(extra).forEach(([id,added])=>{get(id).tracks=[...get(base[id]).tracks,...added.split("|")]});
})();