import { useEffect, useState } from 'react';
import { getCurrentAnnouncement } from '../services/announcementApi.js';

function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getCurrentAnnouncement()
      .then((result) => {
        if (!cancelled) {
          setAnnouncement(result?.announcement || null);
        }
      })
      .catch(() => {
        if (!cancelled) setAnnouncement(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!announcement) return null;

  return (
    <section className={`announcement-banner ${announcement.level || 'info'}`}>
      <div className="announcement-label">公告</div>
      <div className="announcement-body">
        {announcement.title && <h2>{announcement.title}</h2>}
        {announcement.content && <p>{announcement.content}</p>}
      </div>
    </section>
  );
}

export default AnnouncementBanner;
