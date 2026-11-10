// The demo's music catalog: real song titles, artists, albums and years (factual metadata only, no artwork, no
// audio). One line per track: "title|artist|album|year|genres|moods". Genres and moods use the generator's
// vocabulary (Pop, Rock, Rap, ..., Happy, Sad, ...) plus "mpb" for Brazilian music. No imports: Node reads it.
const RAW = `
Blinding Lights|The Weeknd|After Hours|2020|pop,electronic|energetic
Levitating|Dua Lipa|Future Nostalgia|2020|pop|happy,energetic
As It Was|Harry Styles|Harry's House|2022|pop|sad
Watermelon Sugar|Harry Styles|Fine Line|2019|pop|happy,romantic
bad guy|Billie Eilish|When We All Fall Asleep, Where Do We Go?|2019|pop|angry
Shape of You|Ed Sheeran|÷|2017|pop|romantic
drivers license|Olivia Rodrigo|SOUR|2021|pop|sad
good 4 u|Olivia Rodrigo|SOUR|2021|pop,punk|angry,energetic
Anti-Hero|Taylor Swift|Midnights|2022|pop|sad
Cruel Summer|Taylor Swift|Lover|2019|pop|energetic
Shake It Off|Taylor Swift|1989|2014|pop|happy
Flowers|Miley Cyrus|Endless Summer Vacation|2023|pop|happy
Uptown Funk|Mark Ronson, Bruno Mars|Uptown Special|2015|pop,soul|happy,energetic
Rolling in the Deep|Adele|21|2011|pop,soul|angry
Someone Like You|Adele|21|2011|pop|sad
Espresso|Sabrina Carpenter|Short n' Sweet|2024|pop|happy
Dance Monkey|Tones and I|The Kids Are Coming|2019|pop|energetic
CAN'T STOP THE FEELING!|Justin Timberlake|Trolls (Original Motion Picture Soundtrack)|2016|pop|happy
Bad Romance|Lady Gaga|The Fame Monster|2009|pop,electronic|energetic
Halo|Beyoncé|I Am... Sasha Fierce|2008|pop,r&b|romantic
Bohemian Rhapsody|Queen|A Night at the Opera|1975|rock|sad
Don't Stop Me Now|Queen|Jazz|1978|rock|happy,energetic
Smells Like Teen Spirit|Nirvana|Nevermind|1991|rock,punk|angry,energetic
Come As You Are|Nirvana|Nevermind|1991|rock|sad
Hotel California|Eagles|Hotel California|1976|rock|relaxed
Sweet Child O' Mine|Guns N' Roses|Appetite for Destruction|1987|rock|energetic,romantic
Stairway to Heaven|Led Zeppelin|Led Zeppelin IV|1971|rock|relaxed
Wonderwall|Oasis|(What's the Story) Morning Glory?|1995|rock,indie|sad
Mr. Brightside|The Killers|Hot Fuss|2004|rock,indie|energetic
Seven Nation Army|The White Stripes|Elephant|2003|rock|angry
Under the Bridge|Red Hot Chili Peppers|Blood Sugar Sex Magik|1991|rock|sad
Californication|Red Hot Chili Peppers|Californication|1999|rock|relaxed
Yellow|Coldplay|Parachutes|2000|rock,pop|romantic
The Scientist|Coldplay|A Rush of Blood to the Head|2002|rock,pop|sad
Creep|Radiohead|Pablo Honey|1993|rock|sad
Livin' On A Prayer|Bon Jovi|Slippery When Wet|1986|rock|energetic
Back In Black|AC/DC|Back In Black|1980|rock,metal|energetic
Highway to Hell|AC/DC|Highway to Hell|1979|rock,metal|energetic,angry
Here Comes The Sun|The Beatles|Abbey Road|1969|rock,folk|happy,relaxed
Let It Be|The Beatles|Let It Be|1970|rock|relaxed
Do I Wanna Know?|Arctic Monkeys|AM|2013|rock,indie|romantic
505|Arctic Monkeys|Favourite Worst Nightmare|2007|rock,indie|romantic,sad
Everlong|Foo Fighters|The Colour and the Shape|1997|rock|energetic,romantic
Zombie|The Cranberries|No Need to Argue|1994|rock|angry
Enter Sandman|Metallica|Metallica|1991|metal|angry,energetic
Master of Puppets|Metallica|Master of Puppets|1986|metal|angry
Paranoid|Black Sabbath|Paranoid|1970|metal|angry
The Trooper|Iron Maiden|Piece of Mind|1983|metal|energetic
Chop Suey!|System Of A Down|Toxicity|2001|metal|angry
Roots Bloody Roots|Sepultura|Roots|1996|metal,mpb|angry,energetic
Basket Case|Green Day|Dookie|1994|punk|energetic
American Idiot|Green Day|American Idiot|2004|punk|angry
Blitzkrieg Bop|Ramones|Ramones|1976|punk|energetic,happy
All the Small Things|blink-182|Enema of the State|1999|punk|happy
Lose Yourself|Eminem|8 Mile (Music from and Inspired by the Motion Picture)|2002|rap,hip-hop|energetic,angry
Mockingbird|Eminem|Encore|2004|rap,hip-hop|sad
HUMBLE.|Kendrick Lamar|DAMN.|2017|rap,hip-hop|angry,energetic
Alright|Kendrick Lamar|To Pimp a Butterfly|2015|rap,hip-hop|happy
SICKO MODE|Travis Scott|ASTROWORLD|2018|rap,hip-hop|energetic
God's Plan|Drake|Scorpion|2018|rap,hip-hop|happy
Juicy|The Notorious B.I.G.|Ready to Die|1994|rap,hip-hop|happy
In Da Club|50 Cent|Get Rich or Die Tryin'|2003|rap,hip-hop|energetic
Stronger|Kanye West|Graduation|2007|rap,hip-hop,electronic|energetic
Diário de um Detento|Racionais MC's|Sobrevivendo no Inferno|1997|rap,hip-hop,mpb|sad,angry
Negro Drama|Racionais MC's|Nada Como um Dia Após o Outro Dia|2002|rap,hip-hop,mpb|angry
AmarElo|Emicida, Majur, Pabllo Vittar|AmarElo|2019|rap,hip-hop,mpb|happy
Get Lucky|Daft Punk, Pharrell Williams|Random Access Memories|2013|electronic,pop|happy
One More Time|Daft Punk|Discovery|2001|electronic|happy,energetic
Wake Me Up|Avicii|True|2013|electronic,pop|energetic
Titanium|David Guetta, Sia|Nothing but the Beat|2011|electronic,pop|energetic
Midnight City|M83|Hurry Up, We're Dreaming|2011|electronic,indie|energetic
Strobe|deadmau5|For Lack of a Better Name|2009|electronic|relaxed
Sandstorm|Darude|Before the Storm|2000|electronic|energetic
Lean On|Major Lazer, DJ Snake, MØ|Peace Is the Mission|2015|electronic,pop|happy
Clarity|Zedd, Foxes|Clarity|2012|electronic,pop|romantic
Opus|Eric Prydz|Opus|2016|electronic|energetic
So What|Miles Davis|Kind of Blue|1959|jazz|relaxed
Take Five|The Dave Brubeck Quartet|Time Out|1959|jazz|relaxed
My Favorite Things|John Coltrane|My Favorite Things|1961|jazz|relaxed
Fly Me To The Moon|Frank Sinatra, Count Basie|It Might as Well Be Swing|1964|jazz|romantic,happy
What A Wonderful World|Louis Armstrong|What a Wonderful World|1968|jazz|happy,relaxed
Feeling Good|Nina Simone|I Put a Spell on You|1965|jazz,soul|happy
The Girl from Ipanema|Stan Getz, João Gilberto|Getz/Gilberto|1964|jazz,mpb|relaxed,romantic
Águas de Março|Elis Regina, Tom Jobim|Elis & Tom|1974|jazz,mpb|relaxed,happy
Chega de Saudade|João Gilberto|Chega de Saudade|1959|jazz,mpb|romantic,relaxed
Clair de Lune|Claude Debussy|Suite bergamasque|1905|classical|relaxed,romantic
Gymnopédie No. 1|Erik Satie|Trois Gymnopédies|1888|classical|relaxed,sad
La primavera (Le quattro stagioni)|Antonio Vivaldi|Le quattro stagioni|1725|classical|happy
Nocturne in E-flat major, Op. 9 No. 2|Frédéric Chopin|Nocturnes, Op. 9|1832|classical|romantic,relaxed
Canon in D major|Johann Pachelbel|Canon and Gigue in D major|1694|classical|relaxed,romantic
Für Elise|Ludwig van Beethoven|Bagatelle No. 25 in A minor|1810|classical|relaxed
Experience|Ludovico Einaudi|In a Time Lapse|2013|classical|sad,relaxed
Nuvole Bianche|Ludovico Einaudi|Una Mattina|2004|classical|sad,relaxed
Respect|Aretha Franklin|I Never Loved a Man the Way I Love You|1967|soul,r&b|energetic,happy
Ain't No Sunshine|Bill Withers|Just As I Am|1971|soul|sad
Lovely Day|Bill Withers|Menagerie|1977|soul,r&b|happy,relaxed
Let's Stay Together|Al Green|Let's Stay Together|1972|soul|romantic
What's Going On|Marvin Gaye|What's Going On|1971|soul|relaxed
Superstition|Stevie Wonder|Talking Book|1972|soul,r&b|energetic,happy
Crazy In Love|Beyoncé, JAY-Z|Dangerously in Love|2003|r&b,pop|energetic,romantic
No Scrubs|TLC|FanMail|1999|r&b|angry
Thinkin Bout You|Frank Ocean|channel ORANGE|2012|r&b,soul|romantic,sad
Kill Bill|SZA|SOS|2022|r&b|angry,sad
Redbone|Childish Gambino|"Awaken, My Love!"|2016|r&b,soul|romantic
Adorn|Miguel|Kaleidoscope Dream|2012|r&b|romantic
Gostava Tanto de Você|Tim Maia|Tim Maia|1973|soul,mpb|romantic,sad
The Thrill Is Gone|B.B. King|Completely Well|1969|blues|sad
Hoochie Coochie Man|Muddy Waters|The Best of Muddy Waters|1958|blues|energetic
Pride and Joy|Stevie Ray Vaughan & Double Trouble|Texas Flood|1983|blues,rock|happy,energetic
Cross Road Blues|Robert Johnson|King of the Delta Blues Singers|1961|blues|sad
Born Under A Bad Sign|Albert King|Born Under a Bad Sign|1967|blues|sad
Three Little Birds|Bob Marley & The Wailers|Exodus|1977|reggae|happy,relaxed
Redemption Song|Bob Marley & The Wailers|Uprising|1980|reggae,folk|relaxed
Could You Be Loved|Bob Marley & The Wailers|Uprising|1980|reggae|happy
Is This Love|Bob Marley & The Wailers|Kaya|1978|reggae|romantic,relaxed
Red Red Wine|UB40|Labour of Love|1983|reggae,pop|relaxed
Sweat (A La La La La Long)|Inner Circle|Bad to the Bone|1992|reggae|happy
Vapor Barato|O Rappa|Rappa Mundi|1996|reggae,rock,mpb|relaxed,sad
Pescador de Ilusões|O Rappa|Rappa Mundi|1996|reggae,rock,mpb|relaxed
Jolene|Dolly Parton|Jolene|1974|country|sad
Ring of Fire|Johnny Cash|Ring of Fire: The Best of Johnny Cash|1963|country|romantic
Take Me Home, Country Roads|John Denver|Poems, Prayers & Promises|1971|country,folk|happy,relaxed
Tennessee Whiskey|Chris Stapleton|Traveller|2015|country,soul|romantic
Friends in Low Places|Garth Brooks|No Fences|1990|country|happy
Before He Cheats|Carrie Underwood|Some Hearts|2005|country|angry
TEXAS HOLD 'EM|Beyoncé|COWBOY CARTER|2024|country,pop|happy,energetic
Evidências|Chitãozinho & Xororó|Cowboy do Asfalto|1990|country,mpb|romantic,sad
Blowin' in the Wind|Bob Dylan|The Freewheelin' Bob Dylan|1963|folk|relaxed
The Times They Are A-Changin'|Bob Dylan|The Times They Are A-Changin'|1964|folk|sad
Fast Car|Tracy Chapman|Tracy Chapman|1988|folk|sad
Ho Hey|The Lumineers|The Lumineers|2012|folk,indie|happy
Little Lion Man|Mumford & Sons|Sigh No More|2009|folk|angry,energetic
Skinny Love|Bon Iver|For Emma, Forever Ago|2007|folk,indie|sad
Holocene|Bon Iver|Bon Iver, Bon Iver|2011|folk,indie|relaxed,sad
The Sound of Silence|Simon & Garfunkel|Sounds of Silence|1966|folk|sad
Take Me Out|Franz Ferdinand|Franz Ferdinand|2004|indie,rock|energetic
Electric Feel|MGMT|Oracular Spectacular|2007|indie,electronic|happy
Kids|MGMT|Oracular Spectacular|2007|indie,electronic|happy,energetic
The Less I Know The Better|Tame Impala|Currents|2015|indie|romantic,sad
Let It Happen|Tame Impala|Currents|2015|indie,electronic|relaxed
Ribs|Lorde|Pure Heroine|2013|indie,pop|sad
Sweater Weather|The Neighbourhood|I Love You.|2013|indie|romantic
Space Song|Beach House|Depression Cherry|2015|indie|relaxed,romantic
Pumped Up Kicks|Foster The People|Torches|2011|indie,pop|happy
Aquarela|Toquinho|Aquarela|1983|mpb,folk|happy
Tempo Perdido|Legião Urbana|Dois|1986|rock,mpb|sad
Eduardo e Mônica|Legião Urbana|Dois|1986|rock,mpb|romantic,happy
Pais e Filhos|Legião Urbana|As Quatro Estações|1989|rock,mpb|sad
Exagerado|Cazuza|Exagerado|1985|rock,mpb|romantic
Mas Que Nada|Jorge Ben|Samba Esquema Novo|1963|mpb,jazz|happy
País Tropical|Jorge Ben|Jorge Ben|1969|mpb|happy,energetic
Construção|Chico Buarque|Construção|1971|mpb,folk|sad
O Leãozinho|Caetano Veloso|Bicho|1977|mpb,folk|relaxed,romantic
Sozinho|Caetano Veloso|Prenda Minha|1998|mpb,pop|romantic,sad
Velha Infância|Tribalistas|Tribalistas|2002|mpb,pop|romantic,happy
Ainda Bem|Marisa Monte|O Que Você Quer Saber de Verdade|2011|mpb,pop|romantic
Vou Deixar|Skank|Cosmotron|2003|rock,mpb|happy
Garota Nacional|Skank|Samba Poconé|1996|rock,mpb|happy,energetic
Anna Júlia|Los Hermanos|Los Hermanos|1999|rock,mpb|romantic
Lanterna dos Afogados|Os Paralamas do Sucesso|Big Bang|1989|rock,mpb|sad
Meu Erro|Os Paralamas do Sucesso|O Passo do Lui|1984|rock,mpb|sad,romantic
Dias de Luta, Dias de Glória|Charlie Brown Jr.|Imunidade Musical|2005|rock,punk,mpb|energetic
Só os Loucos Sabem|Charlie Brown Jr.|Camisa 10 Joga Bola Até na Chuva|2009|rock,mpb|romantic
Envolver|Anitta|Versions of Me|2022|pop,mpb|energetic
`;

export interface CatalogTrack { name: string; artist: string; album: string; year: number; genres: string[]; moods: string[] }

export const CATALOG: CatalogTrack[] = RAW.trim().split('\n').map((line) => {
  const [name, artist, album, year, genres, moods] = line.split('|');
  return { name, artist, album, year: Number(year), genres: genres.split(','), moods: moods.split(',') };
});
