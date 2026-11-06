import { useState } from "react";
import { useNavigate } from "react-router";
import { CookieSettingsDialog } from "@/components/app/cookie-consent";
import { Button } from "@/components/ui/button";
import { Article } from "../layout";

/** `/s/cookies` (CookiesPageComponent) */
export function CookiePolicyPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(false);
  return (
    <Article>
      <h2>Cookie policy</h2>
      <p>
        This cookie policy ("Policy") describes what cookies are and how Website Operator ("Website Operator", "we",
        "us" or "our") uses them on the{" "}
        <a href="https://www.inatrace.org" target="_blank" rel="noreferrer">
          inatrace.org
        </a>{" "}
        website and any of its products or services (collectively, "Website" or "Services").
        <br />
        You should read this Policy so you can understand what type of cookies we use, the information we collect using
        cookies and how that information is used. It also describes the choices available to you regarding accepting or
        declining the use of cookies. For further information on how we use, store and keep your personal data secure,
        see our Privacy Policy.
      </p>
      <h5>What are cookies?</h5>
      <p>
        Cookies are small pieces of data stored in text files that are saved on your computer or other devices when
        websites are loaded in a browser. They are widely used to remember you and your preferences, either for a single
        visit (through a "session cookie") or for multiple repeat visits (using a "persistent cookie").
        <br />
        Session cookies are temporary cookies that are used during the course of your visit to the Website, and they
        expire when you close the web browser.
        <br />
        Persistent cookies are used to remember your preferences within our Website and remain on your desktop or mobile
        device even after you close your browser or restart your computer. They ensure a consistent and efficient
        experience for you while visiting our Website or using our Services.
        <br />
        Cookies may be set by the Website ("first-party cookies"), or by third parties, such as those who serve content
        or provide advertising or analytics services on the website ("third party cookies"). These third parties can
        recognize you when you visit our website and also when you visit certain other websites.
      </p>
      <h5>What type of cookies do we use?</h5>
      <h6>Necessary cookies</h6>
      <p>
        Necessary cookies allow us to offer you the best possible experience when accessing and navigating through our
        Website and using its features. For example, these cookies let us recognize that you have created an account and
        have logged into that account to access the content.
      </p>
      <h6>Functionality cookies</h6>
      <p>
        Functionality cookies let us operate the Website and our Services in accordance with the choices you make. For
        example, we will recognize your username and remember how you customized the Website and Services during future
        visits.
      </p>
      <h6>Analytical cookies</h6>
      <p>
        These cookies enable us and third-party services to collect aggregated data for statistical purposes on how our
        visitors use the Website. These cookies do not contain personal information such as names and email addresses
        and are used to help us improve your user experience of the Website.
      </p>
      <h6>Social media cookies</h6>
      <p>
        Third-party cookies from social media sites (such as Facebook, Twitter, etc) let us track social network users
        when they visit our Website, use our Services or share content, by using a tagging mechanism provided by those
        social networks.
        <br />
        These cookies are also used for event tracking and remarketing purposes. Any data collected with these tags will
        be used in accordance with our and social networks’ privacy policies. We will not collect or share any
        personally identifiable information from the user.
      </p>
      <h5>What are your cookie options?</h5>
      <p>
        If you don't like the idea of cookies or certain types of cookies, you can change your browser's settings to
        delete cookies that have already been set and to not accept new cookies. To learn more about how to do this or
        to learn more about cookies, visit{" "}
        <a href="https://www.internetcookies.org/" target="_blank" rel="noreferrer">
          internetcookies.org
        </a>
      </p>
      <h5>Changes and amendments</h5>
      <p>
        We reserve the right to modify this Policy relating to the Website or Services at any time, effective upon
        posting of an updated version of this Policy on the Website. When we do, we will revise the updated date at the
        bottom of this page. Continued use of the Website after any such changes shall constitute your consent to such
        changes.
      </p>
      <h5>Acceptance of this policy</h5>
      <p>
        You acknowledge that you have read this Policy and agree to all its terms and conditions. By using the Website
        or its Services you agree to be bound by this Policy. If you do not agree to abide by the terms of this Policy,
        you are not authorized to use or access the Website and its Services.
      </p>
      <h5>Contacting us</h5>
      <p>
        If you would like to contact us to understand more about this Policy or wish to contact us concerning any matter
        relating to our use of cookies, you may send an email to{" "}
        <a href="mailto:info@inatrace.org">info@inatrace.org</a>
      </p>
      <p>This document was last updated on May 2, 2020</p>
      <p className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setSettings(true)}>
          Cookie settings
        </Button>
        <Button variant="outline" onClick={() => navigate("/s/clear-cookies/ALL/null")}>
          Delete all cookies
        </Button>
      </p>
      {settings && <CookieSettingsDialog onClose={() => setSettings(false)} />}
    </Article>
  );
}
