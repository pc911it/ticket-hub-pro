import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Agent {
  id: string;
  full_name: string;
  is_online: boolean;
  is_available: boolean;
  current_location_lat: number | null;
  current_location_lng: number | null;
  last_location_update: string | null;
  phone: string | null;
}

interface LiveAgentMapProps {
  companyId: string | null;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export function LiveAgentMap({ companyId }: LiveAgentMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAgents = async () => {
    if (!companyId) return;
    
    const { data, error } = await supabase
      .from('agents')
      .select('id, full_name, is_online, is_available, current_location_lat, current_location_lng, last_location_update, phone')
      .eq('company_id', companyId)
      .eq('is_online', true);

    if (!error && data) {
      setAgents(data);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchAgents();

    // Set up real-time subscription for agent location updates
    const channel = supabase
      .channel('agent-locations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
        },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAgents, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [companyId]);

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!MAPBOX_TOKEN) {
      setMapError('Mapbox token not configured');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        zoom: 10,
        center: [-80.1918, 25.7617], // Default to Miami
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to load map');
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update markers when agents change
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    const agentsWithLocation = agents.filter(
      agent => agent.current_location_lat && agent.current_location_lng
    );

    if (agentsWithLocation.length === 0) return;

    // Add new markers
    agentsWithLocation.forEach(agent => {
      const el = document.createElement('div');
      el.className = 'agent-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = agent.is_available ? '#22c55e' : '#f59e0b';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '14px';
      el.style.cursor = 'pointer';
      el.innerHTML = agent.full_name.charAt(0).toUpperCase();

      // Pulse animation for online agents
      el.style.animation = 'pulse 2s infinite';

      // Create popup content safely using DOM to prevent XSS
      const popupContent = document.createElement('div');
      popupContent.style.padding = '8px';
      popupContent.style.minWidth = '150px';
      
      const nameEl = document.createElement('strong');
      nameEl.style.fontSize = '14px';
      nameEl.textContent = agent.full_name;
      popupContent.appendChild(nameEl);
      
      const statusEl = document.createElement('p');
      statusEl.style.margin = '4px 0';
      statusEl.style.fontSize = '12px';
      statusEl.style.color = agent.is_available ? '#22c55e' : '#f59e0b';
      statusEl.textContent = agent.is_available ? '● Available' : '● Busy';
      popupContent.appendChild(statusEl);
      
      if (agent.phone) {
        const phoneEl = document.createElement('p');
        phoneEl.style.margin = '4px 0';
        phoneEl.style.fontSize = '12px';
        phoneEl.style.color = '#666';
        phoneEl.textContent = `📞 ${agent.phone}`;
        popupContent.appendChild(phoneEl);
      }
      
      if (agent.last_location_update) {
        const updateEl = document.createElement('p');
        updateEl.style.margin = '4px 0';
        updateEl.style.fontSize = '11px';
        updateEl.style.color = '#999';
        updateEl.textContent = `Updated ${formatDistanceToNow(new Date(agent.last_location_update), { addSuffix: true })}`;
        popupContent.appendChild(updateEl);
      }
      
      const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([agent.current_location_lng!, agent.current_location_lat!])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current[agent.id] = marker;
    });

    // Fit bounds to show all agents
    if (agentsWithLocation.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      agentsWithLocation.forEach(agent => {
        bounds.extend([agent.current_location_lng!, agent.current_location_lat!]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [agents]);

  const onlineWithLocation = agents.filter(a => a.current_location_lat && a.current_location_lng);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Live Agent Locations
            <Badge variant="secondary" className="ml-2">
              <Users className="h-3 w-3 mr-1" />
              {onlineWithLocation.length} tracking
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchAgents} className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
        </p>
      </CardHeader>
      <CardContent>
        {mapError ? (
          <div className="h-64 rounded-lg bg-muted flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{mapError}</p>
          </div>
        ) : onlineWithLocation.length === 0 ? (
          <div className="h-64 rounded-lg bg-muted/50 flex flex-col items-center justify-center gap-2">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No agents with location data online</p>
          </div>
        ) : (
          <div ref={mapContainer} className="h-64 rounded-lg overflow-hidden" />
        )}

        {/* Agent Legend */}
        {onlineWithLocation.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {onlineWithLocation.map(agent => (
              <Badge
                key={agent.id}
                variant="outline"
                className={`cursor-pointer ${agent.is_available ? 'border-success text-success' : 'border-warning text-warning'}`}
                onClick={() => {
                  if (map.current && agent.current_location_lat && agent.current_location_lng) {
                    map.current.flyTo({
                      center: [agent.current_location_lng, agent.current_location_lat],
                      zoom: 15,
                    });
                    markersRef.current[agent.id]?.togglePopup();
                  }
                }}
              >
                <span className={`w-2 h-2 rounded-full mr-1 ${agent.is_available ? 'bg-success' : 'bg-warning'}`} />
                {agent.full_name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>
    </Card>
  );
}
