import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    console.log("Analyze API hit");
    try {
        const formData = await request.formData();
        const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
        console.log("Webhook URL:", webhookUrl);

        if (!webhookUrl) {
            console.error("Missing webhook URL");
            return NextResponse.json(
                { error: 'N8N Webhook URL is not configured (Check .env.local)' },
                { status: 500 }
            );
        }

        // Create a new FormData instance to forward to n8n
        const n8nFormData = new FormData();

        // Retrieve and append files from the incoming request
        const htf = formData.get('image_htf');
        const mid = formData.get('image_mid');
        const ltf = formData.get('image_ltf');

        console.log("Files received:", {
            htf: htf instanceof File ? `File: ${htf.name} (${htf.size})` : 'Missing',
            mid: mid instanceof File ? `File: ${mid.name} (${mid.size})` : 'Missing',
            ltf: ltf instanceof File ? `File: ${ltf.name} (${ltf.size})` : 'Missing',
        });

        // Helper to append safely
        const appendFile = (key: string, file: FormDataEntryValue | null) => {
            if (file && file instanceof File) {
                // Ensure we pass the file with its name
                n8nFormData.append(key, file, file.name);
            }
        };

        appendFile('image_htf', htf);
        appendFile('image_mid', mid);
        appendFile('image_ltf', ltf);

        console.log("Sending to N8N...");

        // Perform the server-to-server POST request to the n8n webhook
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: n8nFormData,
            // fetch() automatically sets the correct Content-Type with boundary
            // for FormData.
        });

        console.log("N8N Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('n8n error body:', errorText);

            // Return error response to the client
            return NextResponse.json(
                {
                    error: `n8n Error: ${response.status} ${response.statusText}`,
                    details: errorText.substring(0, 500) // Truncate just in case
                },
                { status: response.status }
            );
        }

        // Read the response as text first to avoid "Body is unusable" if json() fails
        const responseText = await response.text();
        console.log("N8N Raw Response:", responseText);

        let data;
        try {
            if (!responseText) {
                throw new Error("Empty response from N8N");
            }

            // Check for specific N8N text responses that aren't JSON
            if (responseText.includes("Workflow was started")) {
                return NextResponse.json(
                    {
                        error: "N8N Configuration Error",
                        details: "Your N8N Webhook is set to 'Respond Immediately'. Please change the Webhook node setting 'Respond' to 'Using Respond to Webhook Node' so it waits for the AI analysis."
                    },
                    { status: 400 } // Bad Request because configuration is wrong
                );
            }

            if (responseText.trim().startsWith("<")) {
                return NextResponse.json(
                    {
                        error: "N8N returned HTML instead of JSON",
                        details: "Check if the Webhook URL is correct and the workflow is active. You might be hitting a 404 page or login page."
                    },
                    { status: 502 }
                );
            }

            data = JSON.parse(responseText);
            console.log("N8N Data parsed successfully");

            // --- SAVE TO SUPABASE ---

            // Normalize the data (handle array or single object)
            const result = Array.isArray(data) ? data[0] : data;

            // Only attempt to save if we have a valid signal and supabase client
            if (supabase && result && (result.signal || result.signal_type)) {
                try {
                    const { error: dbError } = await supabase
                        .from('trading_signals')
                        .insert([
                            {
                                asset_name: result.asset_name || result.asset || 'Unknown',
                                signal_type: result.signal_type || result.signal || 'NEUTRAL',
                                outcome: 'PENDING',
                                stop_loss: result.stop_loss || 0,
                                take_profit: result.take_profit || 0,
                                reasoning: result.reasoning || "No reasoning provided",
                                confidence: result.confidence || 0,
                                setup_type: result.setup_type || 'Standard'
                            }
                        ]);

                    if (dbError) {
                        console.error("Failed to save analysis to Supabase:", dbError);
                        // We don't stop the response, just log the error
                    } else {
                        console.log("Analysis saved to Supabase history.");
                    }
                } catch (dbEx) {
                    console.error("Error inserting into Supabase:", dbEx);
                }
            }
            // ------------------------

        } catch (jsonError) {
            console.error("Failed to parse N8N JSON response", jsonError);
            return NextResponse.json(
                {
                    error: "Invalid JSON response from N8N",
                    details: `Raw response start: ${responseText.substring(0, 200)}...`
                },
                { status: 502 }
            );
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Proxy Error Context:', error);
        // Include stack trace/cause if available for local debugging
        return NextResponse.json(
            {
                error: error.message || 'Internal Server Error',
                cause: error.cause ? String(error.cause) : undefined
            },
            { status: 500 }
        );
    }
}
