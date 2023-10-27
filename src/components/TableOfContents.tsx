import { useEffect, useRef, useState } from "preact/hooks";
import "./TableOfContents.css";

function TableOfContents(props: {
  headings: { depth: number; text: string; slug: string }[];
  pubDate?: Date;
}) {
  const headers = props.headings.filter((f) => f.depth < 4);
  const pubDate = props.pubDate;

  const [activeId, setActiveId] = useState();
  if (!pubDate || pubDate <= new Date()) {
    useIntersectionObserver(setActiveId);
  }

  const scrollToHeading = (e) => {
    e.preventDefault();
    if (e.target.href) {
      document
        .querySelector(`#${e.target.getAttribute("data-attr-id")}`)
        .scrollIntoView({
          behavior: "smooth",
        });
    }
  };

  return (
    <>
      {headers.length > 0 && (
        <nav aria-label="Table of Contents" class="toc">
          <ul>
            {headers.map((header) => {
              const className = [
                `link--level${header.depth}`,
                header.slug === activeId ? "link--active" : "",
              ];
              return (
                <li className={className.join(" ")}>
                  {(!pubDate || pubDate <= new Date()) && (
                    <a
                      href={`#${header.slug}`}
                      data-attr-id={header.slug}
                      onClick={scrollToHeading}
                    >
                      {header.text}
                    </a>
                  )}
                  {pubDate && pubDate > new Date() && (
                    <a href="#" data-attr-id={header.slug}>
                      {header.text}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}

export default TableOfContents;

const useIntersectionObserver = (setActiveId) => {
  const headingElementsRef = useRef({});
  useEffect(() => {
    const callback = (headings) => {
      headingElementsRef.current = headings.reduce((map, headingElement) => {
        map[headingElement.target.id] = headingElement;
        return map;
      }, headingElementsRef.current);

      const visibleHeadings = [];
      Object.keys(headingElementsRef.current).forEach((key) => {
        const headingElement = headingElementsRef.current[key];
        if (headingElement.isIntersecting) visibleHeadings.push(headingElement);
      });

      const getIndexFromId = (id) =>
        headingElements.findIndex((heading) => heading.id === id);

      if (visibleHeadings.length === 1) {
        setActiveId(visibleHeadings[0].target.id);
      } else if (visibleHeadings.length > 1) {
        const sortedVisibleHeadings = visibleHeadings.sort(
          (a, b) => getIndexFromId(a.target.id) > getIndexFromId(b.target.id)
        );
        setActiveId(sortedVisibleHeadings[0].target.id);
      }
    };

    const observer = new IntersectionObserver(callback, {
      rootMargin: "0px 0px -30% 0px",
    });

    const headingElements = Array.from(document.querySelectorAll("h2, h3"));

    headingElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [setActiveId]);
};
