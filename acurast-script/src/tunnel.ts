import localtunnel from "localtunnel";
import { logError } from "./errors";

export async function createTunnelWithRetry(
  subdomain: string,
  {
    port = 8080,
    retryDelay = 10000, // delay between retries in milliseconds
  } = {}
) {
  while (true) {
    try {
      const tunnel = await localtunnel({
        host: "https://proxy.acu.run/",
        port,
        subdomain,
      });

      // Check if we actually got the requested subdomain
      if ((tunnel as any).clientId === subdomain) {
        console.log(
          `Successfully set up tunnel on subdomain: https://${subdomain}.acu.run`
        );
        return tunnel;
      } else {
        const errorMsg = `Failed to claim subdomain. Got ${tunnel.url} instead of https://${subdomain}.acu.run`;
        console.log(errorMsg);
        logError(errorMsg, "Tunnel Creation");
        // Close the tunnel, if any, before retrying
        tunnel.close();
      }
    } catch (err) {
      console.log(`Error creating tunnel:`, err);
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }
}
