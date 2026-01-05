
const fetch = require('node-fetch'); // Assuming node environment

const baseUrl = "https://studentmahidolac-my.sharepoint.com/personal/wudhichart_saw_mahidol_ac_th/_layouts/15/download.aspx";
const sourceDoc = "%7B8DEAE777-D52D-4BFE-8610-A99ACC9153ED%7D";

const candidates = [
    // 1. Current Attempt
    "https://studentmahidolac-my.sharepoint.com/:x:/r/personal/wudhichart_saw_mahidol_ac_th/_layouts/15/Doc.aspx?sourcedoc=%7B8DEAE777-D52D-4BFE-8610-A99ACC9153ED%7D&file=682_ITCS223_LabScore.xlsx&action=download&mobileredirect=true",
    // 2. download.aspx with sourcedoc
    `https://studentmahidolac-my.sharepoint.com/personal/wudhichart_saw_mahidol_ac_th/_layouts/15/download.aspx?sourcedoc=${sourceDoc}`,
    // 3. Simple Doc.aspx
    `https://studentmahidolac-my.sharepoint.com/personal/wudhichart_saw_mahidol_ac_th/_layouts/15/Doc.aspx?sourcedoc=${sourceDoc}&action=download`,
    // 4. Guest Access link format (often has different structure, hard to guess without user generating it)
];

async function testUrls() {
    for (const url of candidates) {
        try {
            console.log(`Testing: ${url}`);
            const res = await fetch(url, { method: 'HEAD' });
            console.log(`Status: ${res.status} ${res.statusText}`);
            if (res.status === 200) {
                console.log("SUCCESS! Found working URL.");
                // console.log(url);
            } else if (res.status === 302) {
                console.log(`Redirects to: ${res.headers.get('location')}`);
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
        console.log('---');
    }
}

testUrls();
