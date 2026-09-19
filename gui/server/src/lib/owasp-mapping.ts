/**
 * OWASP Top 10 2025 Vulnerability Mapping
 * Maps vulnerability categories to OWASP Top 10 2025 information
 */

export interface OwaspInfo {
  id: string;
  title: string;
  description: string;
  prevention: string[];
  url: string;
}

export const OWASP_TOP_10_2025: Record<string, OwaspInfo> = {
  'A01': {
    id: 'A01:2025',
    title: 'Broken Access Control',
    description: 'Access control enforces policy such that users cannot act outside of their intended permissions. Failures typically lead to unauthorized information disclosure, modification, or destruction of all data or performing a business function outside the user\'s limits.',
    prevention: [
      'Implement access control mechanisms and enforce them at the application level',
      'Deny by default - except for public resources, deny access by default',
      'Implement access control checks once and re-use them throughout the application',
      'Disable web server directory listing and ensure file metadata and backup files are not present within web roots',
      'Log access control failures and alert admins when appropriate',
      'Rate limit API and controller access to minimize the harm from automated attack tooling',
      'Invalidate JWT tokens on the server after logout'
    ],
    url: 'https://owasp.org/Top10/A01_2025-Broken_Access_Control/'
  },
  'A02': {
    id: 'A02:2025',
    title: 'Cryptographic Failures',
    description: 'Previously known as Sensitive Data Exposure, this category focuses on failures related to cryptography (or lack thereof), which often lead to exposure of sensitive data. Common issues include transmitting data in clear text, using weak or old cryptographic algorithms, and not enforcing encryption.',
    prevention: [
      'Classify data processed, stored, or transmitted by an application',
      'Don\'t store sensitive data unnecessarily - discard it as soon as possible',
      'Encrypt all sensitive data at rest using strong, up-to-date algorithms',
      'Encrypt all data in transit with secure protocols such as TLS with forward secrecy ciphers',
      'Disable caching for responses that contain sensitive data',
      'Store passwords using strong adaptive and salted hashing functions with a work factor',
      'Verify independently the effectiveness of configuration and settings'
    ],
    url: 'https://owasp.org/Top10/A02_2025-Cryptographic_Failures/'
  },
  'A03': {
    id: 'A03:2025',
    title: 'Injection',
    description: 'An application is vulnerable to injection attacks when user-supplied data is not validated, filtered, or sanitized. This includes SQL, NoSQL, OS command, ORM, LDAP, and Expression Language (EL) or Object Graph Navigation Library (OGNL) injection. Hostile data can trick the interpreter into executing unintended commands or accessing data without proper authorization.',
    prevention: [
      'Use a safe API which avoids the use of the interpreter entirely or provides a parameterized interface',
      'Use positive server-side input validation',
      'Escape special characters using the specific escape syntax for that interpreter',
      'Use LIMIT and other SQL controls within queries to prevent mass disclosure of records in case of SQL injection',
      'For dynamic queries, use parameterized queries, prepared statements, or stored procedures',
      'Use ORM frameworks that automatically escape inputs',
      'Validate, filter, and sanitize all user inputs'
    ],
    url: 'https://owasp.org/Top10/A03_2025-Injection/'
  },
  'A04': {
    id: 'A04:2025',
    title: 'Insecure Design',
    description: 'Insecure design is a broad category representing different weaknesses, expressed as "missing or ineffective control design." A secure design can still have implementation defects leading to vulnerabilities. An insecure design cannot be fixed by a perfect implementation as by definition, needed security controls were never created to defend against specific attacks.',
    prevention: [
      'Establish and use a secure development lifecycle with security professionals',
      'Establish and use a library of secure design patterns or paved road ready to use components',
      'Use threat modeling for critical authentication, access control, business logic, and key flows',
      'Integrate security language and controls into user stories',
      'Integrate plausibility checks at each tier of your application',
      'Write unit and integration tests to validate that all critical flows are resistant to the threat model',
      'Segregate tier layers on the system and network layers depending on the exposure and protection needs',
      'Limit resource consumption by user or service'
    ],
    url: 'https://owasp.org/Top10/A04_2025-Insecure_Design/'
  },
  'A05': {
    id: 'A05:2025',
    title: 'Security Misconfiguration',
    description: 'Security misconfiguration is the most commonly seen issue. This is commonly a result of insecure default configurations, incomplete or ad hoc configurations, open cloud storage, misconfigured HTTP headers, and verbose error messages containing sensitive information.',
    prevention: [
      'A repeatable hardening process makes it fast and easy to deploy another environment that is properly locked down',
      'A minimal platform without any unnecessary features, components, documentation, and samples',
      'A task to review and update the configurations appropriate to all security notes, updates, and patches',
      'A segmented application architecture provides effective separation between components',
      'Sending security directives to clients, e.g., Security Headers',
      'An automated process to verify the effectiveness of the configurations and settings in all environments'
    ],
    url: 'https://owasp.org/Top10/A05_2025-Security_Misconfiguration/'
  },
  'A06': {
    id: 'A06:2025',
    title: 'Vulnerable and Outdated Components',
    description: 'You are likely vulnerable if you do not know the versions of all components you use (both client-side and server-side). This includes components you directly use as well as nested dependencies. If the software is vulnerable, unsupported, or out of date, this includes the OS, web/application server, database management system (DBMS), applications, APIs and all components, runtime environments, and libraries.',
    prevention: [
      'Remove unused dependencies, unnecessary features, components, files, and documentation',
      'Continuously inventory the versions of both client-side and server-side components and their dependencies',
      'Only obtain components from official sources over secure links',
      'Monitor for libraries and components that are unmaintained or do not create security patches for older versions',
      'Every organization must ensure an ongoing plan for monitoring, triaging, and applying updates or configuration changes'
    ],
    url: 'https://owasp.org/Top10/A06_2025-Vulnerable_and_Outdated_Components/'
  },
  'A07': {
    id: 'A07:2025',
    title: 'Identification and Authentication Failures',
    description: 'Confirmation of the user\'s identity, authentication, and session management is critical to protect against authentication-related attacks. There may be authentication weaknesses if the application permits automated attacks such as credential stuffing, permits brute force or other automated attacks, permits default, weak, or well-known passwords, uses weak or ineffective credential recovery and forgot-password processes, or uses plain text, encrypted, or weakly hashed passwords.',
    prevention: [
      'Implement multi-factor authentication to prevent automated credential stuffing, brute force, and stolen credential reuse attacks',
      'Do not ship or deploy with any default credentials, particularly for admin users',
      'Implement weak password checks, such as testing new or changed passwords against the top 10,000 worst passwords list',
      'Align password length, complexity, and rotation policies with NIST 800-63b\'s guidelines',
      'Ensure registration, credential recovery, and API pathways are hardened against account enumeration attacks',
      'Limit or increasingly delay failed login attempts, but be careful not to create a denial of service scenario',
      'Use a server-side, secure, built-in session manager that generates a new random session ID with high entropy after login'
    ],
    url: 'https://owasp.org/Top10/A07_2025-Identification_and_Authentication_Failures/'
  },
  'A08': {
    id: 'A08:2025',
    title: 'Software and Data Integrity Failures',
    description: 'Software and data integrity failures relate to code and infrastructure that does not protect against integrity violations. An example of this is where an application relies upon plugins, libraries, or modules from untrusted sources, repositories, and content delivery networks (CDNs). An insecure CI/CD pipeline can introduce the potential for unauthorized access, malicious code, or system compromise.',
    prevention: [
      'Use digital signatures or similar mechanisms to verify the software or data is from the expected source and has not been altered',
      'Ensure libraries and dependencies are consuming trusted repositories',
      'Ensure that a software supply chain security tool is used to verify that components do not contain known vulnerabilities',
      'Ensure that there is a review process for code and configuration changes to minimize the chance that malicious code or configuration could be introduced',
      'Ensure that your CI/CD pipeline has proper segregation, configuration, and access control',
      'Ensure that unsigned or unencrypted serialized data is not sent to untrusted clients without some form of integrity check or digital signature'
    ],
    url: 'https://owasp.org/Top10/A08_2025-Software_and_Data_Integrity_Failures/'
  },
  'A09': {
    id: 'A09:2025',
    title: 'Security Logging and Monitoring Failures',
    description: 'Without logging and monitoring, breaches cannot be detected. Insufficient logging, detection, monitoring, and active response occurs any time when auditable events, such as logins, failed logins, and high-value transactions, are not logged, warnings and errors generate no, inadequate, or unclear log messages, or logs of applications and APIs are not monitored for suspicious activity.',
    prevention: [
      'Ensure all login, access control, and server-side input validation failures can be logged with sufficient user context',
      'Ensure that logs are generated in a format that log management solutions can easily consume',
      'Ensure log data is encoded correctly to prevent injections or attacks on the logging or monitoring systems',
      'Ensure high-value transactions have an audit trail with integrity controls to prevent tampering or deletion',
      'DevSecOps teams should establish effective monitoring and alerting such that suspicious activities are detected and responded to quickly',
      'Establish or adopt an incident response and recovery plan'
    ],
    url: 'https://owasp.org/Top10/A09_2025-Security_Logging_and_Monitoring_Failures/'
  },
  'A10': {
    id: 'A10:2025',
    title: 'Server-Side Request Forgery (SSRF)',
    description: 'SSRF flaws occur whenever a web application is fetching a remote resource without validating the user-supplied URL. It allows an attacker to coerce the application to send a crafted request to an unexpected destination, even when protected by a firewall, VPN, or another type of network access control list (ACL).',
    prevention: [
      'Sanitize and validate all client-supplied input data',
      'Enforce the URL schema, port, and destination with a positive allow list',
      'Do not send raw responses to clients',
      'Disable HTTP redirections',
      'Be aware of the URL consistency to avoid attacks such as DNS rebinding and "time of check, time of use" (TOCTOU) race conditions',
      'Do not mitigate SSRF via the use of a deny list or regular expression. Attackers have payload lists, tools, and skills to bypass deny lists'
    ],
    url: 'https://owasp.org/Top10/A10_2025-Server-Side_Request_Forgery/'
  }
};

/**
 * Maps vulnerability categories to OWASP Top 10 2025 entries
 */
export const CATEGORY_TO_OWASP: Record<string, string> = {
  'XSS': 'A03', // Injection
  'SQLI': 'A03', // Injection
  'INJECTION': 'A03', // Injection
  'AUTH': 'A07', // Identification and Authentication Failures
  'HEADER': 'A05', // Security Misconfiguration
  'MISCONFIGURATION': 'A05', // Security Misconfiguration
  'COOKIE': 'A05', // Security Misconfiguration
  'TLS': 'A02', // Cryptographic Failures
  'EXPOSURE': 'A01', // Broken Access Control
  'DIRECTORY': 'A01', // Broken Access Control
  'ERROR': 'A09', // Security Logging and Monitoring Failures
};

/**
 * Get OWASP information for a vulnerability category
 */
export function getOwaspInfo(category: string): OwaspInfo | null {
  const owaspId = CATEGORY_TO_OWASP[category.toUpperCase()];
  if (!owaspId) return null;
  return OWASP_TOP_10_2025[owaspId] || null;
}

// Made with Bob
