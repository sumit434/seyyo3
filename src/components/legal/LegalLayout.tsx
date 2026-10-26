import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, FileText, RefreshCw, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { SeyyoLogo } from '../common/SeyyoLogo';

export type LegalTabKey = 'contact' | 'terms' | 'privacy' | 'refund';

interface LegalLayoutProps {
  initialTab?: LegalTabKey;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({ initialTab = 'terms' }) => {
  const [activeTab, setActiveTab] = useState<LegalTabKey>(initialTab);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, [activeTab]);

  const handleTabChange = (tab: LegalTabKey) => {
    setActiveTab(tab);
    const path = tab === 'terms' ? '/terms' : tab === 'privacy' ? '/privacy' : tab === 'refund' ? '/refund-policy' : '/terms';
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f3f2] text-[#10181c] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0e7c66] hover:text-[#0a6252] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
          <span className="text-xs font-medium text-[#6a787e]">
            Effective Date: October 2026
          </span>
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">
          <SeyyoLogo className="w-12 h-12 mx-auto mb-3 shadow-sm" />
          <h1 className="text-3xl font-extrabold tracking-tight text-[#10181c]">
            Legal, Compliance & Policies
          </h1>
          <p className="mt-2 text-sm text-[#6a787e]">
            Official business policies and compliance documentation for the seyyo Platform
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 border-b border-[#e2e7e6] pb-4">
          <button
            type="button"
            onClick={() => handleTabChange('terms')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-[#0e7c66] text-white shadow-sm'
                : 'bg-white text-[#6a787e] hover:bg-[#e2e7e6] border border-[#e2e7e6]'
            }`}
          >
            <FileText className="w-4 h-4" />
            Terms & Conditions
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('privacy')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[#0e7c66] text-white shadow-sm'
                : 'bg-white text-[#6a787e] hover:bg-[#e2e7e6] border border-[#e2e7e6]'
            }`}
          >
            <Shield className="w-4 h-4" />
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('refund')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'refund'
                ? 'bg-[#0e7c66] text-white shadow-sm'
                : 'bg-white text-[#6a787e] hover:bg-[#e2e7e6] border border-[#e2e7e6]'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Cancellation & Refund
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('contact')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'contact'
                ? 'bg-[#0e7c66] text-white shadow-sm'
                : 'bg-white text-[#6a787e] hover:bg-[#e2e7e6] border border-[#e2e7e6]'
            }`}
          >
            <Mail className="w-4 h-4" />
            About & Contact
          </button>
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-3xl border border-[#e2e7e6] shadow-xs p-6 sm:p-10 text-sm leading-relaxed space-y-6 text-left">
          {/* TAB: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="border-b border-[#f1f3f2] pb-3">
                <h2 className="text-xl font-bold text-[#10181c]">Terms and Conditions of Service</h2>
                <p className="text-xs text-[#6a787e] mt-1">Last Updated: October 2026</p>
              </div>

              <section id="terms-1" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">1. Introduction & Overview</h3>
                <p>
                  These Terms and Conditions (“Terms”) govern the purchase, access, and use of the seyyo Platform (“Service” or “Platform”), provided by seyyo Technologies India (“seyyo”, “we”, “our”, or “us”).
                </p>
                <p>
                  By purchasing a subscription, completing payment, accessing the merchant terminal, or using the customer reward stations, you (“Merchant”, “you”) agree to these Terms.
                </p>
              </section>

              <section id="terms-2" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">2. Description of the seyyo Service</h3>
                <p>
                  seyyo is an in-store customer engagement and loyalty platform designed for physical merchants, restaurants, cafes, salons, and retail establishments.
                </p>
                <p>The Platform may include:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#2a383f]">
                  <li>Dynamic QR stations and physical NFC tag integration.</li>
                  <li>Digital loyalty stamp cards and customer visit tracking.</li>
                  <li>Gamified Spin and Win reward experiences.</li>
                  <li>Customer review accelerators with Google Maps integration.</li>
                  <li>Staff PIN-protected verification terminals.</li>
                  <li>Customer directories and loyalty record management.</li>
                  <li>Optional WhatsApp shortcuts and predefined copy-and-paste message templates for one-to-one customer communication.</li>
                </ul>
                <p className="text-xs text-[#6a787e]">
                  Feature availability depends on the merchant&apos;s subscription tier and the Platform&apos;s current functionality.
                </p>
              </section>

              <section id="terms-3" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">3. Merchant Eligibility & Account Registration</h3>
                <p>
                  To purchase a seyyo subscription, you must operate a legitimate commercial establishment or otherwise be authorized to act on behalf of the relevant business.
                </p>
                <p>
                  You must provide a valid business email address and accurate registration information. A single-use, cryptographically verified setup link may be issued after payment confirmation.
                </p>
                <p>
                  Merchants are responsible for safeguarding their setup links, staff verification PINs, account credentials, and terminal access.
                </p>
              </section>

              <section id="terms-4" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">4. Subscription Tiers & Payment Processing</h3>
                <p>
                  seyyo provides four principal functional tiers: Spin and Win, Loyalty Log, Review Pro, and Seyyo Combo.
                </p>
                <p>
                  Subscription charges are payable in advance according to the selected plan and applicable pricing. Fees may be charged in Indian Rupees (INR) or other currencies expressly offered at checkout.
                </p>
                <p>
                  Payments are processed by third-party payment providers, such as Razorpay, subject to the provider&apos;s applicable terms and security practices. seyyo does not intentionally collect or store customers&apos; payment card numbers, CVVs, UPI PINs, or net-banking credentials through its own application.
                </p>
                <p>
                  Subscription renewal, cancellation, and refund eligibility are governed by the applicable plan terms and the Cancellation & Refund Policy.
                </p>
              </section>

              <section id="terms-5" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">5. Merchant Responsibilities & Physical Fulfillment</h3>
                <p>Merchants are responsible for:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#2a383f]">
                  <li>Honoring active promotional offers, spin prizes, loyalty rewards, and valid redeemed vouchers.</li>
                  <li>Maintaining the hardware, internet connectivity, QR displays, and NFC tags needed for in-store interactions.</li>
                  <li>Fulfilling food, beverages, retail goods, services, or other benefits promised through their offers.</li>
                  <li>Ensuring that staff members understand the correct reward verification and redemption procedures.</li>
                  <li>Verifying customer visit records, stamp counts, reward eligibility, and offer validity before confirming a reward.</li>
                  <li>Ensuring that customer communications accurately describe available offers and benefits.</li>
                </ul>
                <p className="text-xs text-[#6a787e]">
                  seyyo provides software tools and does not manufacture or supply the merchant&apos;s physical goods or rewards.
                </p>
              </section>

              <section id="terms-6" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">6. Acceptable Use & Fair Interaction Policy</h3>
                <p>
                  Merchants must not manipulate, simulate, or spoof customer visits, QR scans, NFC sessions, reward redemptions, or loyalty records.
                </p>
                <p>
                  Merchants must not automate fraudulent interactions, forge staff PIN verifications, manipulate reward outcomes, submit fraudulent reviews, or tamper with Platform security controls.
                </p>
                <p>
                  seyyo may restrict or suspend access in response to misuse, fraud, or security violations, subject to applicable law and any applicable contractual obligations.
                </p>
              </section>

              <section id="whatsapp-terms" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">
                  7. WhatsApp Messaging & Merchant Communication Responsibilities
                </h3>
                <p>
                  The seyyo Loyalty Log may provide a WhatsApp shortcut and predefined message templates that merchants can copy, edit, and send through WhatsApp. These tools may assist with one-to-one communication about customer lifetime visits, offer-specific stamp counts, loyalty progress, reward eligibility, and promotional offers.
                </p>

                <div className="space-y-3 pt-2 text-xs text-[#2a383f]">
                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">7.1 Manual Messaging Process</h4>
                    <p className="mt-0.5">
                      The merchant or authorized staff member initiates each communication by opening the customer&apos;s WhatsApp conversation. Staff must review the available conversation history and the proposed message before sending it.
                    </p>
                    <p className="mt-1 text-[#6a787e]">
                      Providing a WhatsApp shortcut does not mean that seyyo automatically sends, monitors, approves, or guarantees delivery of the message.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">7.2 Mandatory Chat-History Check</h4>
                    <p className="mt-0.5">
                      Before sending every message, staff must check the customer&apos;s available WhatsApp conversation history for a previous request to stop receiving messages, including “STOP”, “Do not message me”, or equivalent requests.
                    </p>
                    <p className="mt-1 font-semibold text-[#10181c]">
                      If a customer has requested that communications stop, staff must not send the proposed message, even if it uses a predefined seyyo template.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">7.3 Recording and Respecting Opt-Outs</h4>
                    <p className="mt-0.5">
                      When a customer opts out, staff must use the customer-level opt-out control in seyyo, where available, to disable the WhatsApp shortcut for that customer.
                    </p>
                    <p className="mt-1">
                      The opt-out status must persist and be respected in subsequent interactions. Staff must not bypass the disabled shortcut by using another staff account or manually contacting the same customer for the same purpose.
                    </p>
                    <p className="mt-1">
                      The opt-out must remain in effect unless the customer subsequently makes a clear request to resume communications and any required permission or consent has been obtained. Reactivation must follow the Platform&apos;s supported process.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">7.4 No Automatic WhatsApp Opt-Out Detection</h4>
                    <p className="mt-0.5">
                      Unless expressly stated otherwise in the applicable product documentation, seyyo does not automatically monitor WhatsApp conversations, receive incoming WhatsApp messages through a webhook, detect “STOP” messages, or synchronize opt-out requests from WhatsApp.
                    </p>
                    <p className="mt-1">
                      Consequently, seyyo cannot independently verify whether a customer has sent an opt-out request within WhatsApp. The merchant and authorized staff must manually check the available chat history and accurately record the opt-out status in seyyo.
                    </p>
                    <p className="mt-1 text-[#6a787e]">
                      The opt-out control records the merchant&apos;s action within seyyo. It does not independently block the customer in WhatsApp or prevent the merchant from contacting the customer outside the Platform.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">7.5 Preset Messages and Independently Composed Messages</h4>
                    <p className="mt-0.5">
                      Predefined promotional messages are provided as a convenience and general communication aid. They do not guarantee legal compliance, factual accuracy, customer consent, message delivery, or customer response.
                    </p>
                    <p className="mt-1">
                      Merchants may compose other messages, but remain responsible for reviewing their content, recipients, timing, frequency, and purpose before sending them.
                    </p>
                    <p className="mt-1">
                      Merchants must not send misleading, unlawful, abusive, excessively repetitive, unsolicited where prohibited, or otherwise prohibited messages, or use customer contact information for unauthorized purposes.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">7.6 Customer Complaints, Reports, and Continued Outreach</h4>
                    <p className="mt-0.5">
                      If a customer objects to a message, requests that communications stop, or reports the merchant for unwanted messaging, the merchant must immediately stop the relevant outreach and record the opt-out in seyyo, where the feature is available.
                    </p>
                    <p className="mt-1">
                      The merchant is responsible for addressing and resolving complaints arising from its own messaging practices, including unauthorized or unwanted outreach, subject to applicable law.
                    </p>
                    <p className="mt-1">
                      Customers may independently report messages or merchants to WhatsApp or the relevant authorities. seyyo cannot prevent such reports or guarantee their outcome.
                    </p>
                    <p className="mt-1">
                      seyyo does not automatically receive or monitor WhatsApp complaints, incoming messages, or opt-out notifications through WhatsApp webhooks unless such functionality is expressly implemented and disclosed.
                    </p>
                    <p className="mt-1">
                      Merchants must cooperate with legitimate investigations and comply with applicable laws and WhatsApp policies. Where appropriate, seyyo may investigate reported misuse of its own Platform, restrict messaging functionality, or suspend access in accordance with applicable law and its contractual obligations.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">7.7 Merchant Responsibility and Limitation</h4>
                    <p className="mt-0.5">
                      The merchant is responsible for ensuring that its outreach complies with applicable privacy and data protection laws, consumer protection requirements, relevant commercial communication rules, and WhatsApp&apos;s applicable terms and policies.
                    </p>
                    <p className="mt-1">
                      To the extent permitted by applicable law, seyyo is not responsible for merchant-created messages, staff failure to check available conversation history, failure to record an opt-out, unauthorized outreach, or misuse of customer contact information by the merchant.
                    </p>
                    <p className="mt-1">
                      Nothing in these Terms excludes or limits any responsibility that applicable law places on seyyo for its own acts, omissions, Platform operations, or data processing.
                    </p>
                    <p className="mt-1 font-semibold text-[#10181c]">
                      The merchant acknowledges that the WhatsApp shortcut is an optional communication aid and that every message must be reviewed for accuracy, authorization, and appropriateness before sending.
                    </p>
                  </div>
                </div>
              </section>

              <section id="growth-estimator" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">
                  8. Growth Estimator, Platform Limitations &amp; No Guarantee of Results
                </h3>

                <div className="space-y-3 pt-2 text-xs text-[#2a383f]">
                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.1 Growth Estimator Disclaimer</h4>
                    <p className="mt-0.5">
                      The Growth Estimator available on SEYYO is provided solely for illustrative, informational, and planning purposes. All revenue projections, estimated customer visits, customer retention figures, repeat-visit estimates, potential business growth figures, and other outputs generated by the estimator are approximations based on user-provided inputs, assumptions, calculation methods, or other available information. These estimates are not actual business results, verified forecasts, or guarantees of future performance. Actual results may differ significantly from the displayed estimates.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.2 No Guarantee of Business Growth or Performance</h4>
                    <p className="mt-0.5">
                      SEYYO does not guarantee any specific increase in revenue, sales, profits, customer footfall, repeat visits, customer retention, customer engagement, customer acquisition, customer loyalty, Google reviews, ratings, or other business outcomes. The availability or use of SEYYO&apos;s features, including Spin &amp; Win, Digital Loyalty, QR codes, NFC tags, Review Accelerator, promotional campaigns, and customer engagement tools, does not guarantee that customers will participate, return, make purchases, redeem rewards, leave reviews, or generate additional revenue for a merchant. Business results depend on various factors beyond SEYYO&apos;s control, including the merchant&apos;s location, pricing, service quality, product offering, customer experience, marketing activities, competition, customer behaviour, economic conditions, and the merchant&apos;s implementation and use of the platform.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.3 Assumptions and Accuracy of Estimates</h4>
                    <p className="mt-0.5">
                      The Growth Estimator may rely on assumptions, simplified calculations, user-entered figures, sample values, or indicative industry benchmarks where applicable. Estimates may not reflect the merchant&apos;s actual business conditions, historical performance, operating costs, profit margins, customer behaviour, or market circumstances. SEYYO does not warrant that estimates will be complete, accurate, current, or applicable to any particular business. Incorrect, incomplete, outdated, or unrealistic inputs may produce misleading or materially different results. Merchants are responsible for reviewing their inputs and independently assessing whether the displayed estimates are reasonable for their business.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.4 Illustrative Figures Are Not Actual or Guaranteed Earnings</h4>
                    <p className="mt-0.5">
                      Any estimated monetary amount, percentage increase, projected revenue, potential savings, retention figure, or similar numerical representation displayed on SEYYO&apos;s website or within its tools must not be interpreted as a promise of earnings, guaranteed savings, guaranteed return on investment, or evidence of results that every merchant can expect. Unless expressly identified and supported as actual historical data, such figures are illustrative projections only. An estimate does not account for all business expenses, taxes, operating costs, reward costs, marketing expenditure, or other factors that may affect profitability. Merchants should not make financial, operational, purchasing, or investment decisions solely on the basis of an estimate generated by SEYYO.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.5 Platform Availability and Feature Limitations</h4>
                    <p className="mt-0.5">
                      SEYYO provides digital tools intended to support customer engagement and merchant operations. The availability, functionality, performance, and suitability of individual features may depend on the merchant&apos;s configuration, internet connectivity, compatible devices, third-party services, and other technical or operational conditions. SEYYO does not guarantee uninterrupted or error-free operation, universal device compatibility, continuous availability of third-party integrations, or the achievement of a particular commercial outcome. Where a feature, integration, service, or functionality is unavailable, limited, modified, or discontinued, any resulting effect on a merchant&apos;s expected business results may differ from the merchant&apos;s original assumptions. Nothing in this section removes any mandatory consumer, contractual, data-protection, or other legal rights or obligations that cannot lawfully be excluded.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.6 Reviews, Ratings and Third-Party Platforms</h4>
                    <p className="mt-0.5">
                      SEYYO&apos;s Review Accelerator and related review-link features are designed to facilitate access to review platforms. They do not guarantee that a customer will submit a review, that a review will be positive, that a business&apos;s rating will increase, or that any particular number of reviews will be obtained. Third-party platforms, including Google, operate independently and may change their policies, availability, eligibility requirements, display methods, or integration capabilities. Reviews, ratings, links, and third-party services may be subject to restrictions, moderation, removal, delays, or other actions by the relevant provider. Merchants are responsible for ensuring that their review solicitation practices comply with applicable laws and third-party platform policies. SEYYO does not authorise fake reviews, purchased reviews, review manipulation, or incentives conditional on leaving positive reviews.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.7 Merchant Responsibility</h4>
                    <p className="mt-0.5">
                      Merchants are responsible for the accuracy of the business information, assumptions, offers, rewards, promotional content, and other information they submit or publish through SEYYO. Merchants must independently assess whether their use of the platform and any resulting offers, campaigns, customer communications, or business decisions comply with applicable laws, regulations, and third-party requirements. The merchant remains responsible for determining the commercial viability of its offers and rewards, including applicable conditions, redemption rules, costs, and operational requirements.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.8 No Professional or Financial Advice</h4>
                    <p className="mt-0.5">
                      Information, calculations, projections, and recommendations provided through the Growth Estimator or related platform tools are not financial, accounting, tax, legal, or investment advice. Merchants should seek appropriate professional advice where necessary before making significant business or financial decisions.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.9 Limitation of Reliance</h4>
                    <p className="mt-0.5">
                      To the extent permitted by applicable law, merchants acknowledge that the Growth Estimator and other indicative projections are supplementary planning tools and are not a substitute for independent business analysis, verified financial records, market research, or professional advice. To the extent permitted by applicable law, SEYYO shall not be responsible for business decisions made solely in reliance on illustrative estimates or for indirect or consequential losses arising from assumptions that projected outcomes would be achieved. Nothing in these Terms excludes or limits liability where such exclusion or limitation is prohibited by applicable law.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.10 Updates to Estimates and Terms</h4>
                    <p className="mt-0.5">
                      SEYYO may revise its calculation methods, assumptions, feature descriptions, estimates, and platform functionality as the service evolves. An estimate displayed at one time may differ from an estimate generated later, including where inputs, assumptions, or calculation methods have changed. Any material changes to these Terms will be handled in accordance with applicable law. The applicable Terms and Conditions should be reviewed periodically.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">8.11 Acceptance and Interpretation</h4>
                    <p className="mt-0.5">
                      By accessing or using the Growth Estimator, merchants acknowledge that its outputs are indicative estimates rather than guaranteed results. Use of the estimator is subject to these Terms and Conditions and any applicable notices displayed alongside the relevant feature. A reference to “T&amp;C Apply” on SEYYO&apos;s website indicates that the relevant Terms and Conditions apply and should link to the applicable terms. Such a reference does not, by itself, establish acceptance of all terms where separate affirmative acceptance is legally required.
                    </p>
                  </div>
                </div>
              </section>

              <section id="terms-9" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">9. Service Availability &amp; Uptime</h3>
                <p>
                  seyyo strives to maintain reliable access to its cloud-hosted reward stations and staff terminals. Any uptime target expressly published by seyyo is an operational target and not an unconditional guarantee unless separately agreed in writing.
                </p>
                <p>
                  Scheduled maintenance, network interruptions, third-party service failures, or unforeseen technical issues may temporarily affect availability.
                </p>
                <p>
                  seyyo is not responsible for merchant-side hardware failures, local Wi-Fi outages, or third-party telecom disruptions to the extent permitted by applicable law.
                </p>
              </section>

              <section id="terms-10" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">10. Intellectual Property</h3>
                <p>
                  The Platform&apos;s software, algorithms, interfaces, branding, logos, and digital designs are owned by or licensed to seyyo Technologies India.
                </p>
                <p>
                  Merchants receive a limited, non-exclusive, non-transferable licence to use the subscribed features during the applicable subscription term, subject to these Terms.
                </p>
              </section>

              <section id="terms-11" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">11. Cancellation &amp; Refund Policy Reference</h3>
                <p>
                  Subscriptions may be cancelled through available account settings or by contacting <strong>team.seyyo@gmail.com</strong> or <strong>+91 7021127377</strong>.
                </p>
                <p>
                  Refund eligibility, applicable time windows, and payment reversal procedures are described in the separate <a href="/refund-policy" className="text-[#0e7c66] font-semibold underline">Cancellation &amp; Refund Policy</a>.
                </p>
              </section>

              <section id="terms-12" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">12. Limitation of Liability</h3>
                <p>
                  To the maximum extent permitted by applicable law, seyyo will not be liable for indirect, incidental, special, punitive, or consequential losses arising from use of the Platform, including loss of profits, customer disputes, or temporary service interruptions.
                </p>
                <p>
                  To the extent permitted by applicable law, seyyo&apos;s aggregate liability for a claim relating to a specific service will not exceed the amount paid by the merchant for that service during the one-month period immediately preceding the event giving rise to the claim.
                </p>
                <p>
                  Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited.
                </p>
              </section>

              <section id="terms-13" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">
                  13. Complimentary Promotional Hardware &amp; Dispatch Policy
                </h3>
                <p>
                  13.1 <strong>Complimentary Benefit:</strong> Physical hardware items, including but not limited to custom smart NFC tags, cards, or QR stands provided by SEYYO, are complimentary promotional benefits bundled with platform onboarding. They are not separately priced retail products or commercial merchandise included in the platform subscription fee.
                </p>
                <p>
                  13.2 <strong>No Additional Charges:</strong> Merchants are not charged any separate or additional fees for these promotional items unless expressly agreed otherwise in writing (e.g., custom bulk hardware re-orders).
                </p>
                <p>
                  13.3 <strong>Delivery Limitations &amp; Timelines:</strong> Dispatch and fulfillment depend on inventory availability, regional serviceability, and third-party logistics courier conditions. SEYYO does not guarantee immediate or fixed-date delivery.
                </p>
                <p>
                  13.4 <strong>Delays, Non-Delivery &amp; Resolution:</strong> In the event of carrier delays, unserviceable pin codes, or non-delivery by third-party shipping partners, SEYYO will communicate the status to the merchant and offer an appropriate operational resolution where applicable (such as re-dispatch or provision of high-resolution digital QR assets).
                </p>
                <p>
                  13.5 <strong>Merchant Responsibility &amp; Liability:</strong> Merchants bear no responsibility or liability for SEYYO&apos;s dispatch schedules, third-party courier transit delays, carrier mishandling, package loss, or non-delivery outside the merchant&apos;s reasonable control.
                </p>
              </section>

              <section id="terms-14" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">14. Contact &amp; Legal Notices</h3>
                <p>For questions, support requests, or legal notices, contact:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#2a383f]">
                  <li><strong>Email:</strong> team.seyyo@gmail.com</li>
                  <li><strong>Phone:</strong> +91 7021127377</li>
                </ul>
              </section>
            </div>
          )}

          {/* TAB: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-[#f1f3f2] pb-3">
                <h2 className="text-xl font-bold text-[#10181c]">Privacy & Data Protection Policy</h2>
                <p className="text-xs text-[#6a787e] mt-1">Last Updated: October 2026</p>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">1. Introduction</h3>
                <p>
                  seyyo Technologies India (“seyyo”, “we”, “our”, or “us”) respects the privacy of merchant partners and customers who interact with our Platform.
                </p>
                <p>
                  This Privacy Policy explains what information we collect, how we use and protect it, and the circumstances in which information may be shared with service providers or other parties.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">2. Information We Collect</h3>
                <div className="space-y-3 text-xs text-[#2a383f]">
                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">A. Merchant Information</h4>
                    <p className="mt-0.5">
                      We may collect business contact email addresses, establishment names, business categories, location details such as city, country and timezone, branding assets, configuration settings, and staff access credentials.
                    </p>
                    <p className="mt-1 text-[#6a787e]">
                      Staff security PINs should be stored as salted cryptographic hashes rather than readable PINs.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">B. Payment & Order Information</h4>
                    <p className="mt-0.5">
                      We may store payment order IDs, transaction timestamps, payment status, subscription tier references, and other transaction identifiers needed for subscription management and support.
                    </p>
                    <p className="mt-1 text-[#6a787e]">
                      Payment credentials are handled by the relevant payment provider. seyyo does not intentionally store payment card numbers, CVVs, UPI PINs, or net-banking credentials in its own application.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">C. Customer Information</h4>
                    <p className="mt-0.5">
                      When customers interact with QR or NFC stations, we may collect their mobile numbers, visit counts, timestamps, loyalty progress, offer-specific stamp counts, reward eligibility information, and optional feedback ratings.
                    </p>
                    <p className="mt-1 text-[#6a787e]">
                      Customer mobile numbers may be used as identifiers for loyalty and visit-tracking purposes. They are not necessarily verified through OTP unless a particular feature explicitly provides such verification.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">D. Messaging & Opt-Out Information</h4>
                    <p className="mt-0.5">
                      Where the Loyalty Log customer directory supports WhatsApp outreach, we may process customer contact details and associated loyalty records used to prepare messages.
                    </p>
                    <p className="mt-1">
                      If staff record a customer&apos;s opt-out status in seyyo, we may retain that status against the relevant customer record to prevent subsequent use of the Platform&apos;s WhatsApp shortcut for that customer.
                    </p>
                    <p className="mt-1 text-[#6a787e]">
                      The opt-out record is maintained based on information entered by the merchant or its authorized staff. Unless explicitly implemented and disclosed, seyyo does not independently receive or monitor the customer&apos;s WhatsApp conversation history.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">3. How We Use Collected Information</h3>
                <p>We use collected information for legitimate Platform purposes, including:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#2a383f]">
                  <li>Provisioning merchant accounts and issuing onboarding links.</li>
                  <li>Processing subscription and payment status information.</li>
                  <li>Calculating customer loyalty milestones and enforcing applicable visit cooldowns.</li>
                  <li>Enabling staff verification and reward redemption.</li>
                  <li>Facilitating customer review handoffs to relevant merchant profiles.</li>
                  <li>Supporting merchant-initiated communications using customer records.</li>
                  <li>Recording customer opt-out preferences entered by authorized staff.</li>
                  <li>Providing service updates, billing information, technical support, and security protections.</li>
                </ul>
                <p className="text-xs text-[#6a787e]">
                  We do not represent that every use is automatically lawful in every circumstance. Processing will be subject to applicable legal requirements and any necessary permissions or consent.
                </p>
              </section>

              <section id="whatsapp-privacy" className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">4. WhatsApp Messaging & Customer Opt-Outs</h3>
                <p>
                  The seyyo Loyalty Log may provide a shortcut that opens a customer&apos;s WhatsApp conversation and may provide predefined message text that staff can copy, edit, and send manually.
                </p>
                <p>
                  The merchant or its authorized staff member is responsible for initiating the conversation and reviewing the message before sending it.
                </p>

                <div className="space-y-3 pt-2 text-xs text-[#2a383f]">
                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">Manual chat-history verification</h4>
                    <p className="mt-0.5">
                      Before sending each message, staff must review the available WhatsApp conversation history for a previous request to stop receiving communications, including “STOP” or an equivalent request.
                    </p>
                    <p className="mt-1 font-bold italic text-[#10181c]">
                      If a customer has opted out, staff must not send the message and must record the opt-out using the customer-level control provided by seyyo, where available.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">No automatic webhook monitoring</h4>
                    <p className="mt-0.5">
                      Unless expressly stated otherwise, seyyo does not use an incoming WhatsApp webhook to monitor customer conversations or automatically detect opt-out messages. Staff must identify opt-outs manually and accurately update the customer&apos;s status in seyyo.
                    </p>
                    <p className="mt-1 text-[#6a787e]">
                      The Platform&apos;s opt-out control records the merchant&apos;s action within seyyo. It does not independently block the customer in WhatsApp or verify that the merchant has complied outside the Platform.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#10181c]">Third-party messaging services</h4>
                    <p className="mt-0.5">
                      When a merchant uses WhatsApp, the merchant&apos;s interaction with that service is subject to WhatsApp&apos;s applicable terms and privacy practices. Depending on the workflow and the merchant&apos;s actions, customer contact details or message content may be processed by WhatsApp.
                    </p>
                    <p className="mt-1 font-semibold italic text-[#10181c]">
                      seyyo will not claim that customer information is never shared with third parties where the actual technical workflow involves such sharing.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">5. Payment Processing Through Razorpay</h3>
                <p>
                  Payments are processed by Razorpay Software Private Limited or the payment provider presented at checkout.
                </p>
                <p>
                  Payment information is transmitted to the relevant provider through its supported payment process. seyyo may receive transaction identifiers, payment status, order references, and other information necessary to activate subscriptions and manage billing.
                </p>
                <p className="text-xs text-[#6a787e]">
                  The provider&apos;s own privacy policy and terms apply to information it processes.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">6. Sharing of Personal Information</h3>
                <p>
                  seyyo does not sell or rent merchant or customer contact lists to advertisers or data brokers.
                </p>
                <p>
                  Information may be processed or shared with infrastructure providers, payment processors, hosting providers, and other service providers where reasonably necessary to operate, secure, and support the Platform, subject to applicable law and appropriate safeguards.
                </p>
                <p>
                  Information may also be disclosed where required by law, to address security incidents, or to protect legitimate rights, subject to applicable legal requirements.
                </p>
                <p className="text-xs text-[#6a787e]">
                  Merchants remain responsible for any additional disclosure or processing of customer information they carry out independently, including sharing information through WhatsApp.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">7. Data Security</h3>
                <p>
                  seyyo uses appropriate technical and organizational safeguards designed to protect personal information. Depending on the feature and implementation, these may include:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#2a383f]">
                  <li>HTTPS/TLS encryption in transit.</li>
                  <li>Salted cryptographic hashing for staff PINs.</li>
                  <li>Short-lived engagement-session tokens and server-side validation.</li>
                  <li>Access controls and rate limiting.</li>
                  <li>Restricted access to merchant and customer records.</li>
                  <li>Measures to protect recorded opt-out preferences from unauthorized modification.</li>
                </ul>
                <p className="text-xs text-[#6a787e]">
                  No electronic system can be guaranteed completely secure. Security measures may evolve as the Platform develops.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">8. Data Retention & User Rights</h3>
                <p>
                  Merchant records, customer visit logs, loyalty records, and opt-out statuses may be retained while required to provide the service, maintain security, resolve disputes, comply with legal obligations, or enforce legitimate business requirements.
                </p>
                <p>
                  Merchants may request access to, correction of, export of, or deletion of relevant information, subject to applicable law, technical feasibility, and legitimate retention requirements.
                </p>
                <p>
                  Opt-out records may need to be retained in a limited form to help prevent unwanted future contact, even where other customer information is deleted, where permitted by law.
                </p>
                <p>
                  To submit a request or ask a privacy question, contact <strong>team.seyyo@gmail.com</strong> or <strong>+91 7021127377</strong>.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">9. Merchant Responsibilities for Customer Data</h3>
                <p>
                  Merchants must use customer contact details only for authorized and lawful purposes, implement appropriate access controls, and ensure that staff understand their privacy responsibilities.
                </p>
                <p>
                  Merchants must check WhatsApp conversation history before every outgoing message, respect customer opt-out requests, and accurately record those requests in seyyo&apos;s customer directory where the opt-out feature is available.
                </p>
                <p className="font-bold text-[#10181c]">
                  Merchants must not use customer records for unauthorized marketing, disclose them to unauthorized parties, or circumvent a recorded opt-out.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">10. Policy Updates & Contact</h3>
                <p>
                  This Privacy Policy may be updated to reflect changes in Platform functionality, operational practices, or legal requirements. The latest version and its effective date will be made available through the appropriate Platform or website location.
                </p>
                <div className="p-3 bg-[#f1f3f2] rounded-xl text-xs space-y-1">
                  <p><strong>Email:</strong> team.seyyo@gmail.com</p>
                  <p><strong>Phone:</strong> +91 7021127377</p>
                </div>
              </section>
            </div>
          )}

          {/* TAB: CANCELLATION & REFUND */}
          {activeTab === 'refund' && (
            <div className="space-y-6">
              <div className="border-b border-[#f1f3f2] pb-3">
                <h2 className="text-xl font-bold text-[#10181c]">Cancellation & Refund Policy</h2>
                <p className="text-xs text-[#6a787e] mt-1">Last Updated: October 2026</p>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">1. Policy Overview</h3>
                <p>
                  seyyo aims to provide a transparent onboarding and subscription experience for retail, dining, salon, and other physical merchants.
                </p>
                <p>
                  This policy explains subscription cancellation, refund eligibility, unsuccessful payments, onboarding issues, duplicate charges, and refund processing.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">2. Subscription Cancellation</h3>
                <p>
                  Merchants may cancel their seyyo subscription through the available account settings or by contacting <strong>team.seyyo@gmail.com</strong> with their registered business email and merchant identification details.
                </p>
                <p>
                  Unless otherwise specified by the applicable subscription terms or required by law, cancellation stops renewal and access continues until the end of the current prepaid billing period.
                </p>
                <p>
                  After the applicable subscription period ends, access may expire and further subscription charges will not be made for the cancelled subscription.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">3. Refund Eligibility Window</h3>
                <p>
                  seyyo offers a seven-day full refund guarantee from the payment timestamp for newly purchased licences, subject to the following conditions:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#2a383f]">
                  <li>The request is submitted within seven days of payment.</li>
                  <li>The merchant has not deployed the QR/NFC stations live in the physical store with active customer visits.</li>
                  <li>The purchase meets any other applicable legal or contractual requirements for a refund.</li>
                </ul>
                <p className="text-xs text-[#6a787e]">
                  Once live customer visits have been recorded, the current billing cycle becomes non-refundable under this policy, except where another provision of this policy or applicable law provides otherwise.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">4. Failed or Unsuccessful Transactions</h3>
                <p>
                  If payment fails or is interrupted before successful confirmation, the subscription will not be activated and a setup link will not be dispatched on the basis of that failed payment.
                </p>
                <p>
                  If an amount is debited despite a failed transaction, the reversal timeline depends on the payment provider and the relevant bank or payment network. We will assist with transaction verification where reasonably possible.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">5. Technical Onboarding Issues</h3>
                <p>
                  If payment succeeds but the merchant cannot access the setup link or configure the staff terminal, the merchant should contact <strong>team.seyyo@gmail.com</strong> or <strong>+91 7021127377</strong>.
                </p>
                <p>
                  seyyo will make reasonable efforts to resolve the issue. If the issue cannot be resolved within 48 hours after notification, the merchant will be eligible for a full refund under this policy, subject to verification and applicable law.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">6. Duplicate Charges</h3>
                <p>
                  If a merchant is charged more than once for the same subscription due to a verified duplicate transaction, the merchant should notify seyyo promptly.
                </p>
                <p>
                  After verification, the duplicate charge will be refunded without an additional deduction, subject to the payment provider&apos;s processing procedures and applicable law.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">7. Refund Processing Method & Timeline</h3>
                <p>
                  Approved refunds will generally be processed through the original payment provider and returned to the original payment source, where supported.
                </p>
                <p>
                  Refunds typically reflect within five to seven business days after processing, although actual timing may depend on the payment provider, bank, and payment method.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">8. Third-Party Messaging Feature Availability</h3>
                <p>
                  The WhatsApp shortcut and predefined message templates are supplementary Platform features. Their availability may depend on WhatsApp, the merchant&apos;s device, internet connectivity, and applicable third-party policies.
                </p>
                <p className="text-xs text-[#6a787e]">
                  Temporary unavailability, rejection, or non-delivery of a message does not automatically entitle the merchant to a refund, subject to the express refund commitments in this policy and applicable law.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">9. Merchant Messaging Misuse</h3>
                <p>
                  Merchants are responsible for the messages they initiate through WhatsApp, including verifying message content, checking the customer&apos;s chat history before sending, respecting opt-out requests, and recording opt-outs in seyyo where the feature is available.
                </p>
                <p>
                  A merchant&apos;s failure to follow these procedures, or misuse of customer information, may result in restriction of messaging functionality or suspension of Platform access, subject to applicable law.
                </p>
                <p className="text-xs text-[#6a787e]">
                  This section does not remove any refund entitlement expressly provided elsewhere in this policy or any rights that cannot lawfully be excluded.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-base text-[#10181c]">10. Contact & Refund Requests</h3>
                <p>For cancellation, refund requests, or payment support, contact:</p>
                <div className="p-3 bg-[#f1f3f2] rounded-xl text-xs space-y-1">
                  <p><strong>Email:</strong> team.seyyo@gmail.com</p>
                  <p><strong>Phone:</strong> +91 7021127377</p>
                </div>
              </section>
            </div>
          )}

          {/* TAB: ABOUT & CONTACT */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="border-b border-[#f1f3f2] pb-3">
                <h2 className="text-xl font-bold text-[#10181c]">About seyyo & Official Contact Details</h2>
                <p className="text-xs text-[#6a787e] mt-1">Verified Information</p>
              </div>

              <p>
                <strong>seyyo</strong> is an innovative offline-to-online customer engagement platform. We equip brick-and-mortar restaurants, cafes, and retail stores with dynamic reward stations, fast-track stamp loyalty cards, and Google review acceleration terminals.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#f1f3f2] border border-[#e2e7e6] space-y-1">
                  <div className="flex items-center gap-2 text-[#0e7c66] font-bold text-xs uppercase">
                    <Mail className="w-4 h-4" /> Customer & Merchant Support
                  </div>
                  <p className="font-semibold text-sm">team.seyyo@gmail.com</p>
                  <p className="text-xs text-[#6a787e]">Response time: Within 24 hours</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#f1f3f2] border border-[#e2e7e6] space-y-1">
                  <div className="flex items-center gap-2 text-[#0e7c66] font-bold text-xs uppercase">
                    <Phone className="w-4 h-4" /> Merchant Assistance Hotline
                  </div>
                  <p className="font-semibold text-sm">+91 7021127377</p>
                  <p className="text-xs text-[#6a787e]">Mon–Fri, 10:00 AM – 6:00 PM IST</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-[#6a787e] space-y-2">
          <p>© {new Date().getFullYear()} seyyo. All rights reserved.</p>
          <div className="flex justify-center gap-4 text-[11px]">
            <a href="/terms" className="hover:text-[#10181c]">Terms & Conditions</a>
            <span>•</span>
            <a href="/privacy" className="hover:text-[#10181c]">Privacy Policy</a>
            <span>•</span>
            <a href="/refund-policy" className="hover:text-[#10181c]">Cancellation & Refund</a>
          </div>
        </div>
      </div>
    </div>
  );
};
