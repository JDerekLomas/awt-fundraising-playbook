// Twitter/X Post & Thread Script
// Usage:
//   node twitter-post.js "Your tweet text"
//   node twitter-post.js --thread thread-name
//   node twitter-post.js --list
//
// Requires: .env file with Twitter credentials

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load credentials from .env
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && !key.startsWith('#')) {
            env[key.trim()] = valueParts.join('=').trim();
        }
    });
    return env;
}

const env = loadEnv();
const credentials = {
    apiKey: env.TWITTER_API_KEY,
    apiSecret: env.TWITTER_API_SECRET,
    accessToken: env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: env.TWITTER_ACCESS_TOKEN_SECRET
};

// OAuth 1.0a signature generation
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
    const signatureBase = [
        method.toUpperCase(),
        encodeURIComponent(url),
        encodeURIComponent(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&'))
    ].join('&');

    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
    return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function generateNonce() {
    return crypto.randomBytes(16).toString('hex');
}

async function makeRequest(method, endpoint, body = null) {
    const url = `https://api.twitter.com${endpoint}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();

    const oauthParams = {
        oauth_consumer_key: credentials.apiKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_token: credentials.accessToken,
        oauth_version: '1.0'
    };

    const signature = generateOAuthSignature(
        method,
        url,
        oauthParams,
        credentials.apiSecret,
        credentials.accessTokenSecret
    );

    oauthParams.oauth_signature = encodeURIComponent(signature);

    const authHeader = 'OAuth ' + Object.keys(oauthParams)
        .map(k => `${k}="${oauthParams[k]}"`)
        .join(', ');

    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

// Post a single tweet
async function postTweet(text, replyToId = null) {
    const body = { text };
    if (replyToId) {
        body.reply = { in_reply_to_tweet_id: replyToId };
    }

    const result = await makeRequest('POST', '/2/tweets', body);

    if (result.status === 201 && result.data.data) {
        return result.data.data;
    } else {
        throw new Error(`Failed to post tweet: ${JSON.stringify(result.data)}`);
    }
}

// Post a thread (array of tweets)
async function postThread(tweets) {
    console.log(`\nPosting thread with ${tweets.length} tweets...\n`);

    let previousTweetId = null;
    const postedTweets = [];

    for (let i = 0; i < tweets.length; i++) {
        const tweet = tweets[i];
        console.log(`[${i + 1}/${tweets.length}] Posting: "${tweet.substring(0, 50)}..."`);

        try {
            const result = await postTweet(tweet, previousTweetId);
            previousTweetId = result.id;
            postedTweets.push(result);
            console.log(`   ✓ Posted: https://twitter.com/AncientWisdomTr/status/${result.id}`);

            // Small delay between tweets to avoid rate limits
            if (i < tweets.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (e) {
            console.log(`   ✗ Error: ${e.message}`);
            break;
        }
    }

    return postedTweets;
}

// Pre-written campaign threads
const THREADS = {
    // Thread 1: The Problem (hook with stats)
    'problem': [
        `95% of Renaissance books have never been translated.

The intellectual DNA of the modern world—philosophy, science, medicine—is locked away in Latin.

Books that shaped Newton, Copernicus, and the entire Enlightenment. Inaccessible.

Here's what we're doing about it 🧵`,

        `The Bibliotheca Philosophica Hermetica in Amsterdam holds 25,000+ rare texts.

Alchemy. Hermetic philosophy. Early science. Kabbalah.

These aren't dusty curiosities—they're the foundations of Western thought.

And 70% have never even been digitized.`,

        `Think about what's in these books:

• Marsilio Ficino's translations that sparked the Renaissance
• Giordano Bruno's cosmology (he was burned at the stake for it)
• Paracelsus's medical texts that founded toxicology
• The Hermetic texts that influenced everyone from Newton to Jung`,

        `Here's the problem:

Traditional scholarly translation = 1-2 books per scholar per year.

At that rate, it would take centuries to unlock this knowledge.

But AI changes everything.`,

        `We're using AI to translate at scale—then having classical scholars verify and annotate.

The technology is finally ready.

The books are physically deteriorating. Every year we wait, pages crumble.

The time to act is now.`,

        `We're raising $500K to digitize and translate 5,000 texts.

$500 digitizes one rare book.
$1,000 funds an expert translation.

And right now, every gift is MATCHED up to $10,000.

Join us: ancientwisdomtrust.org

#Renaissance #AI #DigitalHumanities`
    ],

    // Thread 2: AI Angle
    'ai': [
        `What if AI was trained on the best of human thought—not just what happened to make it online?

Most AI training data is Reddit threads. Wikipedia. News articles.

But 500 years of philosophy and wisdom never made it to the internet.

We're fixing that. 🧵`,

        `AI systems are being built RIGHT NOW.

They're learning from whatever text is available online.

That means they know internet culture deeply.

But Renaissance philosophy? Hermetic wisdom? The foundations of Western science?

Mostly missing.`,

        `This matters because AI will shape the future.

Do we want AI that understands the depth of human thought?

Or AI that only knows what was digitized in the last 30 years?`,

        `The Ancient Wisdom Trust is translating 5,000 rare Renaissance texts.

Using AI to translate at scale.
Classical scholars to verify quality.
Published free for everyone—including AI training.`,

        `These texts include:

• The Hermetic Corpus that shaped Renaissance thought
• Alchemical works that influenced Jung's psychology
• Early scientific texts that laid groundwork for Newton
• Philosophy that defined Western civilization`,

        `We're raising $500K. Every gift is matched up to $10K through Dec 31.

$250 = 1 AI translation published
$500 = 1 rare book digitized
$1,000 = 1 expert-reviewed translation

Help train AI on wisdom, not just the internet:
ancientwisdomtrust.org`
    ],

    // Thread 3: Personal/Story
    'story': [
        `I never expected to be fundraising to translate 500-year-old books.

But here I am.

A thread about how I discovered a problem hiding in plain sight—and why I can't look away. 🧵`,

        `A year ago, I learned a statistic that changed everything:

95% of Renaissance books have never been translated.

Not "aren't widely read."

NEVER TRANSLATED. Into any modern language.`,

        `I kept thinking about it.

The Renaissance sparked the modern world. Art. Science. Philosophy.

But we can only read 5% of what they actually wrote?

How is this possible in 2024?`,

        `The answer: Latin.

Thousands of books written in NeoLatin, sitting in libraries.

Accessible only to the handful of scholars who read classical Latin.

For everyone else—locked away.`,

        `Then I discovered the Bibliotheca Philosophica Hermetica in Amsterdam.

25,000+ rare texts. UNESCO-recognized.

Alchemy, Hermeticism, early science, philosophy.

Books that shaped Newton, Copernicus, Jung.

Mostly undigitized. Untranslated.`,

        `I couldn't unsee it.

So I started the Ancient Wisdom Trust.

We're using AI to translate these texts at scale—then having scholars verify them.

Making them free for everyone.`,

        `Right now, we're raising $500K to digitize and translate 5,000 texts.

I'm personally matching every gift up to $10,000.

Give $500, we receive $1,000—enough to digitize a rare book forever.

Will you help?

ancientwisdomtrust.org`
    ],

    // Thread 4: Year-End Urgency
    'yearend': [
        `🚨 5 days left to double your impact.

I'm matching all gifts to @AncientWisdomTr up to $10,000 through Dec 31.

Here's exactly what your tax-deductible gift accomplishes: 🧵`,

        `$100 → $200 matched
Supports the campaign to preserve Renaissance wisdom.

$250 → $500 matched
Publishes 1 complete AI translation, free online forever.`,

        `$500 → $1,000 matched
Digitizes 1 rare Renaissance book. High-res scanning, archival storage, preserved forever.

$1,000 → $2,000 matched
Funds 1 expert-supervised translation with your name in acknowledgments.`,

        `Why does this matter?

95% of Renaissance books have never been translated.
70% haven't been digitized.
These 500-year-old pages are physically crumbling.

Every year we wait, knowledge is lost forever.`,

        `The matching gift expires Dec 31.

Your donation is tax-deductible for 2024.

Help preserve the intellectual foundations of Western civilization.

ancientwisdomtrust.org/donate

Thank you. 🙏`
    ],

    // Thread 5: Quick Impact Thread
    'impact': [
        `What does $500 actually accomplish?

At @AncientWisdomTr, we're obsessively transparent about where your money goes.

Here's the real breakdown: 🧵`,

        `$500 = 1 RARE BOOK DIGITIZED

• High-resolution scanning of fragile 500-year-old pages
• Image processing and OCR
• Archival-quality digital storage
• That book is preserved forever`,

        `$250 = 1 AI TRANSLATION PUBLISHED

• Machine translation from Latin/Greek
• Basic quality review
• Published free online
• Searchable, accessible to everyone`,

        `$1,000 = 1 EXPERT TRANSLATION

• AI translation as starting point
• Classical scholar review and correction
• Annotations explaining context
• Your name in acknowledgments`,

        `$5,000+ = CUSTOM RESEARCH

• Commission research on a topic of your choice
• Direct collaboration with our scholars
• Deep dive into the collection
• Unique insights from unpublished sources`,

        `Our $500K budget:

40% → Digitization ($200K)
25% → Expert Review ($125K)
20% → AI Translation ($100K)
10% → Publication ($50K)
5% → Operations ($25K)

No bloat. Every dollar → preservation.

ancientwisdomtrust.org`
    ]
};

// Display available threads
function listThreads() {
    console.log('\nAvailable pre-written threads:\n');
    Object.keys(THREADS).forEach(name => {
        console.log(`  --thread ${name}`);
        console.log(`     ${THREADS[name].length} tweets, starts with: "${THREADS[name][0].substring(0, 60)}..."\n`);
    });
}

// Preview a thread without posting
function previewThread(name) {
    const thread = THREADS[name];
    if (!thread) {
        console.log(`Thread "${name}" not found. Use --list to see available threads.`);
        return;
    }

    console.log(`\n=== Thread: ${name} (${thread.length} tweets) ===\n`);
    thread.forEach((tweet, i) => {
        console.log(`--- Tweet ${i + 1} (${tweet.length} chars) ---`);
        console.log(tweet);
        console.log('');
    });
}

// Main
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
Twitter/X Post & Thread Script for @AncientWisdomTr

Usage:
  node twitter-post.js "Your tweet text"           Post a single tweet
  node twitter-post.js --thread <name>             Post a pre-written thread
  node twitter-post.js --preview <name>            Preview a thread without posting
  node twitter-post.js --list                      List available threads

Examples:
  node twitter-post.js "Testing the API!"
  node twitter-post.js --preview problem
  node twitter-post.js --thread problem
`);
        return;
    }

    if (args[0] === '--list') {
        listThreads();
        return;
    }

    if (args[0] === '--preview' && args[1]) {
        previewThread(args[1]);
        return;
    }

    if (args[0] === '--thread' && args[1]) {
        const threadName = args[1];
        const thread = THREADS[threadName];

        if (!thread) {
            console.log(`Thread "${threadName}" not found. Use --list to see available threads.`);
            return;
        }

        console.log(`\n⚠️  About to post thread "${threadName}" with ${thread.length} tweets.`);
        console.log('This will post to @AncientWisdomTr immediately.\n');

        // Show preview
        previewThread(threadName);

        console.log('To confirm, run with --confirm flag:');
        console.log(`  node twitter-post.js --thread ${threadName} --confirm`);

        if (args.includes('--confirm')) {
            const result = await postThread(thread);
            console.log(`\n✓ Thread posted! ${result.length} tweets.`);
            console.log(`View: https://twitter.com/AncientWisdomTr/status/${result[0].id}`);
        }
        return;
    }

    // Single tweet
    const tweetText = args.join(' ');

    if (tweetText.length > 280) {
        console.log(`Tweet too long (${tweetText.length} chars). Max 280.`);
        return;
    }

    console.log(`\nPosting: "${tweetText}"\n`);

    if (!args.includes('--confirm')) {
        console.log('To confirm, add --confirm flag:');
        console.log(`  node twitter-post.js "${tweetText}" --confirm`);
        return;
    }

    try {
        const result = await postTweet(tweetText);
        console.log(`✓ Posted: https://twitter.com/AncientWisdomTr/status/${result.id}`);
    } catch (e) {
        console.log(`✗ Error: ${e.message}`);
    }
}

main();
