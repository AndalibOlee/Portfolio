# HG Web: how to publish and update your website

Your whole website is **one file**: `index.html`. The pictures are built into it, so there are no other files to keep track of.

---

## Part 1: Publish it on your own domain (one time)

### Step 1: Put the site on Netlify
1. Go to **https://app.netlify.com** and log in.
2. Click **Add new site → Deploy manually**.
3. Drag **hgweb-site.zip** onto the page.
4. Netlify gives your site a temporary address like `something-123.netlify.app`. Open it to check the site.
5. Optional: under **Site configuration → Change site name**, rename it to something like `hgweb`.

### Step 2: Connect your domain
1. In your Netlify site, go to **Domain management → Add a domain**.
2. Type your domain (for example `hgweb.ca`) and click **Verify**, then **Add domain**.
3. Netlify shows you DNS settings. Log in to the company where you bought the domain (GoDaddy, Namecheap, etc.) and pick **one** of these options:
   - **Option A (easiest):** Change the domain's **nameservers** to the 4 nameservers Netlify shows you.
   - **Option B:** Keep your nameservers and add these 2 records:

     | Type  | Name / Host | Value                      |
     |-------|-------------|----------------------------|
     | A     | `@`         | `75.2.60.5`                |
     | CNAME | `www`       | `your-site-name.netlify.app` |

   ⚠️ If you use email at this domain (like info@hgweb.ca), use **Option B**, or copy your email (MX) records into Netlify before switching. That keeps your email working.
4. Wait. It can take from a few minutes up to 24–48 hours.
5. Netlify turns on **HTTPS (the padlock)** for free once the domain works. Check under **Domain management → HTTPS**.

### Step 3: Get contact form messages by email
1. In Netlify, go to **Forms**. If you see **Enable form detection**, click it, then drag the zip in again (see Part 2).
2. After someone submits the form, you'll see a form called **contact** with all the messages.
3. To get an email for each message: **Site configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email notification**, then enter your email.
4. Test it: fill in the form on your live site and check your inbox (and spam folder).

---

## Part 2: How to change something later

### The easy way: ask Claude
Open a Claude Code session on this repository and say what you want, for example:
*"Change the Growing team price to $80"* or *"Add a new service card for payroll"*.
Claude will update `index.html` and give you a new zip. Then follow **"Put the new version online"** below.

### The do-it-yourself way
1. Open `index.html` in a plain text editor:
   - Windows: **Notepad** (right-click the file → Open with → Notepad)
   - Mac: **TextEdit** (Format menu → Make Plain Text first)
   - Free, nicer option: **VS Code** (code.visualstudio.com)
2. Use **Find** (Ctrl+F on Windows, Cmd+F on Mac) to find the words you want to change, and type the new words.
3. Only change **words between tags**, like the text in `<p>…</p>`. Don't delete the `< >` parts.
4. Save the file, then double-click it to check it in your browser.

**To change prices:** press Ctrl+F and search for `edit plans, fees and discounts here`. You'll see:

```
var P={yearly:0.15,promoPct:50,promoMonths:3,plans:[
  {id:'small',name:'Small team',size:'1–25 employees',min:1,max:25,setup:5000,user:50, ...
```

| To change…                        | Edit this                      |
|-----------------------------------|--------------------------------|
| Yearly discount (15%)             | `yearly:0.15` (0.20 = 20%)     |
| Intro discount (50%)              | `promoPct:50`                  |
| How many months the offer lasts   | `promoMonths:3`                |
| One-time setup fee                | `setup:5000`                   |
| Price per user per month          | `user:50`                      |
| Features in each plan             | the text inside `f:[ ... ]`    |

Use plain numbers only: no `$` and no commas.

**Other common changes (search for these words):**
- Your quote at the top: `I love making people`
- Your About story: `I came to Masset`
- Email address: `info@hgweb.ca` (it appears in a few places, so change them all)
- Services: `Ask about this`
- FAQ / contact text: `What's the challenge`

### Put the new version online
1. Put the updated `index.html` into a zip file:
   - Windows: right-click it → **Send to → Compressed (zipped) folder**
   - Mac: right-click it → **Compress**
2. In Netlify, open your site → **Deploys**.
3. Drag the new zip onto the box that says **"Drag and drop your site output folder here"**.
4. In about 30 seconds the live site is updated. Your domain and form settings stay the same.

💡 **Undo a mistake:** in **Deploys**, click an older deploy → **Publish deploy**. The previous version comes back straight away.
