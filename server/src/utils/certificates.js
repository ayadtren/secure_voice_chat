const forge = require('node-forge');
const os = require('os');

/**
 * Generates a self-signed SSL certificate for local HTTPS
 * @returns {Object} Object containing key and cert as PEM strings
 */
function generateSelfSignedCert() {
  // Generate a key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create a certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  
  // Set certificate attributes
  cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(16));
  
  // Certificate validity (1 year)
  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
  // Set certificate subject and issuer attributes
  const attrs = [
    { name: 'commonName', value: os.hostname() },
    { name: 'countryName', value: 'US' },
    { name: 'stateOrProvinceName', value: 'California' },
    { name: 'localityName', value: 'Local Network' },
    { name: 'organizationName', value: 'Secure Voice Chat' },
    { name: 'organizationalUnitName', value: 'Development' }
  ];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs); // Self-signed, so issuer = subject
  
  // Set extensions
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false
    },
    {
      name: 'keyUsage',
      digitalSignature: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true
    },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: os.hostname() },
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' }
      ]
    }
  ]);
  
  // Self-sign the certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());
  
  // Convert to PEM format
  const pem = {
    key: forge.pki.privateKeyToPem(keys.privateKey),
    cert: forge.pki.certificateToPem(cert)
  };
  
  return pem;
}

module.exports = {
  generateSelfSignedCert
};
