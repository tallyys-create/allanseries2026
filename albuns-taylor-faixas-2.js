(() => {
const T={
"reputation":"...Ready for It?|End Game (feat. Ed Sheeran & Future)|I Did Something Bad|Don't Blame Me|Delicate|Look What You Made Me Do|So It Goes...|Gorgeous|Getaway Car|King of My Heart|Dancing with Our Hands Tied|Dress|This Is Why We Can't Have Nice Things|Call It What You Want|New Year's Day",
"lover":"I Forgot That You Existed|Cruel Summer|Lover|The Man|The Archer|I Think He Knows|Miss Americana & the Heartbreak Prince|Paper Rings|Cornelia Street|Death by a Thousand Cuts|London Boy|Soon You'll Get Better (feat. The Chicks)|False God|You Need to Calm Down|Afterglow|ME! (feat. Brendon Urie)|It's Nice to Have a Friend|Daylight"
};for(const [id,v] of Object.entries(T)){const a=window.TAYLOR_ALBUMS.find(x=>x.id===id);if(a)a.tracks=v.split("|");}
})();