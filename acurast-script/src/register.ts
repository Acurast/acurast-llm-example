import { REGISTER_URL } from "./constants";

declare let _STD_: any;

export const DEPLOYMENT = {
  appVersion: _STD_.app_info.version,
  deploymentId: _STD_.job.getId(),
  deviceAddress: _STD_.device.getAddress(),
};

export const registerUrl = async (deploymentUrl: string): Promise<void> => {
  if (!REGISTER_URL) {
    throw new Error("REGISTER_URL is not set");
  }

  const info = {
    ...DEPLOYMENT,
    url: deploymentUrl,
    timestamp: Date.now(),
  };

  const toSign: string[] = [
    info.deploymentId,
    info.url,
    info.deviceAddress,
    info.timestamp.toString(),
  ];

  const hexString = toSign.join(",");

  const signature = _STD_.chains.bitcoin.signer.rawSign(
    _STD_.chains.bitcoin.signer.sha256(hexString)
  );

  const response = await fetch(`${REGISTER_URL}/deployments/register`, {
    method: "POST",
    body: JSON.stringify({ ...info, signature }),
  });

  if (!response.ok) {
    throw new Error("Failed to register");
  }

  const data = await response.json();
  console.log(data);

  return data;
};
