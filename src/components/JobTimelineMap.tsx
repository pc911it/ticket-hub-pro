import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Play, Square } from 'lucide-react';

interface JobUpdate {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  location_lat: number | null;
  location_lng: number | null;
  agents: { full_name: string } | null;
}

interface JobTimelineMapProps {
  jobUpdates: JobUpdate[];
  callStartedAt: string | null;
  callEndedAt: string | null;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const STATUS_COLORS: Record<string, string> = {
  assigned: '#6366f1',
  en_route: '#f59e0b',
  on_site: '#3b82f6',
  working: '#8b5cf6',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

export function JobTimelineMap({ jobUpdates, callStartedAt, callEndedAt }: JobTimelineMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Filter updates that have location data
  const updatesWithLocation = jobUpdates.filter(
    (update) => update.location_lat !== null && update.location_lng !== null
  );

  // Calculate duration
  const calculateDuration = () => {
    if (!callStartedAt) return null;
    const start = new Date(callStartedAt);
    const end = callEndedAt ? new Date(callEndedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, isOngoing: !callEndedAt };
  };

  const duration = calculateDuration();

  useEffect(() => {
    if (!mapContainer.current || updatesWithLocation.length === 0) return;

    if (!MAPBOX_TOKEN) {
      setMapError('Mapbox token not configured');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        zoom: 14,
        center: [updatesWithLocation[0].location_lng!, updatesWithLocation[0].location_lat!],
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add markers for each location
      updatesWithLocation.forEach((update, index) => {
        const color = STATUS_COLORS[update.status] || '#6b7280';
        
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundColor = color;
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.color = 'white';
        el.style.fontSize = '12px';
        el.style.fontWeight = 'bold';
        el.innerHTML = `${index + 1}`;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <strong style="text-transform: capitalize;">${update.status.replace('_', ' ')}</strong>
            <p style="margin: 4px 0 0; font-size: 12px; color: #666;">
              ${format(new Date(update.created_at), 'MMM d, h:mm a')}
            </p>
            ${update.notes ? `<p style="margin: 4px 0 0; font-size: 12px;">${update.notes}</p>` : ''}
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat([update.location_lng!, update.location_lat!])
          .setPopup(popup)
          .addTo(map.current!);
      });

      // Draw line connecting points
      if (updatesWithLocation.length > 1) {
        map.current.on('load', () => {
          const coordinates = updatesWithLocation.map((u) => [u.location_lng!, u.location_lat!]);

          map.current?.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates,
              },
            },
          });

          map.current?.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#6366f1',
              'line-width': 3,
              'line-dasharray': [2, 2],
            },
          });

          // Fit bounds to show all markers
          const bounds = new mapboxgl.LngLatBounds();
          coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
          map.current?.fitBounds(bounds, { padding: 50 });
        });
      }
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to load map');
    }

    return () => {
      map.current?.remove();
    };
  }, [updatesWithLocation]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time Tracking */}
        <div className="flex flex-wrap gap-3">
          {callStartedAt && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="gap-1">
                <Play className="h-3 w-3 text-success" />
                Started: {format(new Date(callStartedAt), 'h:mm a')}
              </Badge>
            </div>
          )}
          {callEndedAt && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="gap-1">
                <Square className="h-3 w-3 text-destructive" />
                Ended: {format(new Date(callEndedAt), 'h:mm a')}
              </Badge>
            </div>
          )}
          {duration && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {duration.hours > 0 && `${duration.hours}h `}
              {duration.minutes}m
              {duration.isOngoing && ' (ongoing)'}
            </Badge>
          )}
        </div>

        {/* Map */}
        {updatesWithLocation.length > 0 ? (
          mapError ? (
            <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{mapError}</p>
            </div>
          ) : (
            <div ref={mapContainer} className="h-48 rounded-lg overflow-hidden" />
          )
        ) : (
          <div className="h-32 rounded-lg bg-muted/50 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No location data available yet</p>
          </div>
        )}

        {/* Location Updates List */}
        {updatesWithLocation.length > 0 && (
          <div className="space-y-2">
            {updatesWithLocation.map((update, index) => (
              <div
                key={update.id}
                className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/30"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: STATUS_COLORS[update.status] || '#6b7280' }}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <span className="capitalize font-medium">{update.status.replace('_', ' ')}</span>
                  <span className="text-muted-foreground ml-2">
                    {format(new Date(update.created_at), 'h:mm a')}
                  </span>
                </div>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
