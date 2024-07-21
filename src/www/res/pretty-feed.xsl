<?xml version="1.0" encoding="utf-8"?>
<!--

FORKED FROM: https://github.com/nhoizey/nicolas-hoizey.com/blob/ac2ad201c7649909e5c7f98f385ab152fac82850/src/assets/pretty-atom-feed-v3.xsl

# Pretty Atom Feed

Based on "Pretty RSS Feed": https://github.com/genmon/aboutfeeds/issues/26

Styles an Atom feed, making it friendly for humans viewers, and adds a link
to aboutfeeds.com for new user onboarding. See it in action:

https://nicolas-hoizey.com/feeds/all.xml

-->
<xsl:stylesheet
    version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="4.0" encoding="UTF-8" indent="yes" cdata-section-elements="article"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="atom:feed/atom:title"/></title>
        <style type="text/css">*{box-sizing:border-box}body{background-color:#fff;color:#24292e;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";line-height:1.5}a{color:#0366d6;text-decoration:none}a:hover{text-decoration:underline}.container{max-width:40rem;margin:1rem auto;padding:1rem}nav{margin-top:2rem;margin-bottom:2rem}p{margin-top:0;margin-bottom:1rem}h1,h2,h3{margin-top:0;margin-bottom:1rem;font-weight:600;line-height:1.25}h1{padding-bottom:.3em;font-size:2em}h1 svg{padding-right:.25rem;vertical-align:text-bottom;width:1.2em;height:1.2em}h2{margin-top:1.5rem;padding-bottom:.3em;font-size:1.5em;border-bottom:1px solid #eaecef}h3{font-size:1.25em;margin-bottom:0}.about{background-color:#fff5b1;margin:.25rem -.25rem;padding:.25rem}header{padding-top:2rem;padding-bottom:2rem}.item{padding-bottom:2rem}.gray{color:#586069}</style>
      </head>
      <body>
        <nav class="container">
          <p class="about">
            <strong>This is a web feed,</strong> also known as an RSS or Atom feed.<br /><strong>Subscribe</strong> by copying the URL from the address bar into your newsreader.
          </p>
          <p class="gray">
            Visit <a href="https://aboutfeeds.com">About Feeds</a> to get started with newsreaders and subscribing. It’s free.
          </p>
        </nav>
        <div class="container">
          <header>
            <h1>
              <svg xmlns="http://www.w3.org/2000/svg" version="1.1" id="rss-icon" viewBox="32 32 204 204">
                  <circle cx="68" cy="189" r="24" fill="#E3702D"/>
                  <path d="M160 213h-34a82 82 0 0 0 -82 -82v-34a116 116 0 0 1 116 116z" fill="#E3702D"/>
                  <path d="M184 213A140 140 0 0 0 44 73 V 38a175 175 0 0 1 175 175z" fill="#E3702D"/>
              </svg>
              Web Feed Preview
            </h1>
            <h2><xsl:value-of select="atom:feed/atom:title"/></h2>
            <p><xsl:value-of select="atom:feed/atom:description"/></p>
            <p>This preview only shows titles, but the actual feed contains the full content.</p>
            <a>
              <xsl:attribute name="href">
                <xsl:value-of select="/atom:feed/atom:link[not(@rel)]/@href"/>
              </xsl:attribute>
              Visit Website &#x2192;
            </a>
          </header>
          <h2>Recent Items</h2>
          <xsl:apply-templates select="atom:feed/atom:entry" />
        </div>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="atom:feed/atom:entry">
    <div class="item">
      <h3>
        <a>
          <xsl:attribute name="href">
            <xsl:value-of select="atom:link/@href"/>
          </xsl:attribute>
          <xsl:value-of select="atom:title"/>
        </a>
      </h3>
      <small class="gray">
        Published: <xsl:value-of select="atom:updated" />
      </small>
    </div>
  </xsl:template>
</xsl:stylesheet>
