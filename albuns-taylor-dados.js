(() => {
const A=[
["debut","Taylor Swift",2006,"Country / country pop","#5c9183","O início em Nashville: violão, botas e as primeiras histórias adolescentes."],
["fearless","Fearless",2008,"Country pop","#d4ac59","Vestidos dourados, contos de fadas e os clipes de Love Story e You Belong with Me."],
["speak-now","Speak Now",2010,"Country pop / pop rock","#9064b6","A era roxa: castelos, vestidos e canções escritas inteiramente por Taylor."],
["red","Red",2012,"Pop / country pop","#b95450","Cachecol vermelho, cores de outono e a montanha-russa emocional de All Too Well."],
["1989","1989",2014,"Synth-pop / dance-pop","#88bed1","Polaroids, Nova York, gaivotas e a grande reinvenção pop."],
["reputation","reputation",2017,"Electropop / synth-pop","#6d7074","Cobras, preto e branco, reputação e uma estética cheia de tensão."],
["lover","Lover",2019,"Pop / synth-pop","#df8fb8","Corações, borboletas e cores pastel na era de Lover e ME!."],
["folklore","folklore",2020,"Indie folk / alternative","#858987","Florestas, cabanas, preto e branco e histórias contadas como pequenos filmes."],
["evermore","evermore",2020,"Indie folk / alternative","#8f6b4d","Casacos, tranças e uma atmosfera de inverno e histórias misteriosas."],
["fearless-tv","Fearless (Taylor's Version)",2021,"Country pop","#bca16a","O retorno da era dourada, agora com novas fotografias e canções do cofre."],
["red-tv","Red (Taylor's Version)",2021,"Pop / country pop","#924f46","O cachecol revisitado, All Too Well: The Short Film e as faixas do cofre."],
["midnights","Midnights",2022,"Synth-pop / electropop","#364a78","Relógios, vinis, brilho azul-marinho e pensamentos das madrugadas."],
["speak-now-tv","Speak Now (Taylor's Version)",2023,"Country pop / pop rock","#7652a5","A era roxa renasce com novas fotos, figurinos e I Can See You."],
["1989-tv","1989 (Taylor's Version)",2023,"Synth-pop / dance-pop","#75b8d8","Céu azul, praia e uma nova leitura visual da era pop de 2014."],
["ttpd","The Tortured Poets Department",2024,"Pop / synth-pop","#a7a29a","Páginas datilografadas, romance dramático e uma estética monocromática."],
["anthology","The Tortured Poets Department: The Anthology",2024,"Pop / folk alternativo","#676965","A edição dupla amplia o universo poético, intimista e melancólico do álbum."],
["showgirl","The Life of a Showgirl",2025,"Pop","#d27d5c","Plumas, holofotes, glamour e o universo dos bastidores de um espetáculo."],
["encore","The Life of a Showgirl: The Encore",2026,"Pop","#bb6d7e","O espetáculo ganha um segundo ato e quatro canções inéditas."]
];
window.TAYLOR_ALBUMS=A.map(([id,title,year,genre,color,memo])=>({id,title,year,genre,color,memo,tracks:[]}));
})();