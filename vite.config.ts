import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import Razorpay from 'razorpay';

function localApiPlugin() {
  return {
    name: 'local-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.startsWith('/api/create-razorpay-order') && req.method === 'POST') {
          try {
            let bodyData: any = {};
            await new Promise<void>((resolve) => {
              let bodyStr = '';
              req.on('data', (chunk: any) => { bodyStr += chunk; });
              req.on('end', () => {
                try {
                  bodyData = JSON.parse(bodyStr);
                } catch (e) {}
                resolve();
              });
            });

            const { amount } = bodyData;
            if (!amount) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: "Amount is required" }));
              return;
            }

            const razorpay = new Razorpay({
              key_id: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_live_SP1moeTEpMdwF7',
              key_secret: process.env.RAZORPAY_KEY_SECRET || '0Y7NA1wPSIbqIcKeUAXfrZ6f',
            });

            const options = {
              amount: amount * 100, // in paise
              currency: "INR",
              receipt: `receipt_${Date.now()}`,
            };

            const order = await razorpay.orders.create(options);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(order));
          } catch (error: any) {
            console.error("Local dev: error creating Razorpay order:", error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: "Failed to create order", details: error.message }));
          }
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), localApiPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
