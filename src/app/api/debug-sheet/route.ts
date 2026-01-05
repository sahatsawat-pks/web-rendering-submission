import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheets";

export async function GET() {
    try {
        const subject = 'ITCS223';
        const sections = ['Section 1', 'Section 2', 'Section 3'];
        const report: any = {};

        for (const sec of sections) {
            try {
                const rows = await getSheetData(subject, sec);
                if (!rows || rows.length === 0) {
                    report[sec] = "Empty or Not Found";
                    continue;
                }

                const headers = rows[0];
                report[sec] = {
                    headers: headers,
                    rowCount: rows.length,
                    sampleRow: rows.length > 1 ? rows[1] : null
                };

                // Test Regex for Lab 1
                const labNum = "1";
                const labRegex = new RegExp(`^(Lab\\s*${labNum}|L${labNum}|L0${labNum})(\\s*\\(.*\\))?$`, 'i');
                const matchIndex = headers.findIndex((h: string) => labRegex.test(h));
                report[sec].regexTest_Lab1 = {
                    foundIndex: matchIndex,
                    foundHeader: matchIndex !== -1 ? headers[matchIndex] : "Not Found"
                };

            } catch (e: any) {
                report[sec] = `Error: ${e.message}`;
            }
        }

        return NextResponse.json(report);
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
