import { useState, useRef, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Ship, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Zap, 
  Activity,
  Thermometer,
  Gauge,
  Fuel,
  Users
} from 'lucide-react';

interface DigitalTwin {
  id: string;
  vesselId: string;
  twinType: string;
  name: string;
  specifications: any;
  currentState: any;
  validationStatus: string;
  accuracy: number;
  lastUpdate: string;
}

interface TwinSimulation {
  id: string;
  scenarioName: string;
  scenarioType: string;
  status: string;
  progressPercentage: number;
  startTime: string;
  endTime?: string;
}

export function DigitalTwinViewer() {
  const [selectedTwin, setSelectedTwin] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'dashboard' | 'simulation'>('dashboard');
  const [isSimulating, setIsSimulating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch digital twins
  const { data: twins = [], isLoading: twinsLoading } = useQuery({
    queryKey: ['/api/digital-twins'],
    refetchInterval: 30000 // Update every 30 seconds
  });

  // Fetch simulations for selected twin
  const { data: simulations = [] } = useQuery({
    queryKey: ['/api/digital-twins', selectedTwin, 'simulations'],
    enabled: !!selectedTwin,
    refetchInterval: 5000 // Update every 5 seconds during simulation
  });

  const selectedTwinData = twins.find((t: DigitalTwin) => t.id === selectedTwin);

  // Initialize basic 3D viewer (simplified for demo)
  useEffect(() => {
    if (viewMode === '3d' && canvasRef.current && selectedTwinData) {
      initializeViewer();
    }
  }, [viewMode, selectedTwinData]);

  const initializeViewer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple 2D representation for demo (in production, would use Three.js)
    canvas.width = 800;
    canvas.height = 600;
    
    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw vessel outline
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Simple ship shape
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Hull
    ctx.moveTo(centerX - 150, centerY + 50);
    ctx.lineTo(centerX - 120, centerY - 30);
    ctx.lineTo(centerX + 120, centerY - 30);
    ctx.lineTo(centerX + 150, centerY + 50);
    ctx.closePath();
    ctx.stroke();

    // Superstructure
    ctx.strokeRect(centerX - 80, centerY - 60, 160, 30);
    ctx.strokeRect(centerX - 50, centerY - 90, 100, 30);

    // Equipment indicators
    if (selectedTwinData?.currentState?.machinery) {
      const machinery = selectedTwinData.currentState.machinery;
      
      // Engine status
      ctx.fillStyle = machinery.engines?.MAIN_ENGINE_01?.temperature > 100 ? '#ef4444' : '#22c55e';
      ctx.fillRect(centerX - 20, centerY - 10, 40, 20);
      
      // Generator status  
      ctx.fillStyle = machinery.generators?.GEN_01?.voltage > 0 ? '#22c55e' : '#ef4444';
      ctx.fillRect(centerX + 40, centerY - 40, 20, 15);
    }

    // Add labels
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px system-ui';
    ctx.fillText('Main Engine', centerX - 30, centerY + 15);
    ctx.fillText('Generator', centerX + 45, centerY - 20);
    ctx.fillText(`Speed: ${selectedTwinData?.currentState?.speed || 0} knots`, 20, 30);
    ctx.fillText(`Heading: ${selectedTwinData?.currentState?.heading || 0}°`, 20, 50);
  };

  const startSimulation = async (scenarioType: string) => {
    if (!selectedTwin) return;

    const scenario = {
      scenarioType,
      parameters: getScenarioParameters(scenarioType),
      duration: 240, // 4 hours
      timeStep: 5, // 5 minutes per step
      environmentalConditions: {
        seaState: 3,
        windSpeed: 15,
        windDirection: 180,
        visibility: 10,
        temperature: 20
      }
    };

    try {
      setIsSimulating(true);
      await fetch(`/api/digital-twins/${selectedTwin}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioName: `${scenarioType}_simulation_${Date.now()}`,
          scenario
        })
      });
    } catch (error) {
      console.error('Failed to start simulation:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  const getScenarioParameters = (scenarioType: string) => {
    switch (scenarioType) {
      case 'maintenance':
        return {
          maintenance: {
            maintenanceAction: 'overhaul',
            duration: 480, // 8 hours
            degradationRate: 0.02
          }
        };
      case 'failure':
        return {
          failure: {
            component: 'main_engine',
            failureTime: 60, // 1 hour
            severity: 'high'
          }
        };
      case 'optimization':
        return {
          optimization: {
            targetSpeed: 10,
            targetEfficiency: 0.92
          }
        };
      default:
        return {};
    }
  };

  const formatState = (state: any) => {
    if (!state) return {};
    return {
      speed: `${state.speed || 0} knots`,
      heading: `${state.heading || 0}°`,
      fuel: `${state.fuel?.currentLevel || 0}/${state.fuel?.totalCapacity || 0} tons`,
      crew: `${state.crew?.onboard || 0} crew members`
    };
  };

  if (twinsLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Ship className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Digital Twin Viewer</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="digital-twin-viewer">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Ship className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Digital Twin Viewer</h2>
          <Badge variant="outline" className="ml-2">
            {twins.length} Active Twins
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant={viewMode === 'dashboard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('dashboard')}
            data-testid="button-dashboard-view"
          >
            <Activity className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <Button 
            variant={viewMode === '3d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('3d')}
            data-testid="button-3d-view"
          >
            <Settings className="h-4 w-4 mr-1" />
            3D View
          </Button>
          <Button 
            variant={viewMode === 'simulation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('simulation')}
            data-testid="button-simulation-view"
          >
            <Play className="h-4 w-4 mr-1" />
            Simulation
          </Button>
        </div>
      </div>

      {/* Twin Selection */}
      {twins.length === 0 ? (
        <Alert data-testid="alert-no-twins">
          <Ship className="h-4 w-4" />
          <AlertDescription>
            No digital twins found. Create a digital twin for your vessels to start monitoring and simulation.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {twins.map((twin: DigitalTwin) => (
            <Card 
              key={twin.id} 
              className={`cursor-pointer transition-all ${selectedTwin === twin.id ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setSelectedTwin(twin.id)}
              data-testid={`card-twin-${twin.id}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{twin.name}</span>
                  <Badge 
                    variant={twin.validationStatus === 'active' ? 'default' : 'secondary'}
                    data-testid={`badge-status-${twin.id}`}
                  >
                    {twin.validationStatus}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Type: {twin.twinType} | Accuracy: {(twin.accuracy * 100).toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {Object.entries(formatState(twin.currentState)).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500 capitalize">{key}:</span>
                      <span data-testid={`text-${key}-${twin.id}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content */}
      {selectedTwinData && (
        <Tabs value={viewMode} className="w-full">
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Key Metrics Cards */}
              <Card data-testid="card-speed-metric">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Gauge className="h-4 w-4 mr-2 text-blue-500" />
                    Speed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-current-speed">
                    {selectedTwinData.currentState?.speed || 0}
                  </div>
                  <p className="text-xs text-gray-500">knots</p>
                </CardContent>
              </Card>

              <Card data-testid="card-fuel-metric">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Fuel className="h-4 w-4 mr-2 text-green-500" />
                    Fuel Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-fuel-level">
                    {((selectedTwinData.currentState?.fuel?.currentLevel || 0) / (selectedTwinData.currentState?.fuel?.totalCapacity || 1) * 100).toFixed(0)}%
                  </div>
                  <p className="text-xs text-gray-500">
                    {selectedTwinData.currentState?.fuel?.currentLevel || 0} / {selectedTwinData.currentState?.fuel?.totalCapacity || 0} tons
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-engine-metric">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Thermometer className="h-4 w-4 mr-2 text-red-500" />
                    Engine Temp
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-engine-temp">
                    {selectedTwinData.currentState?.machinery?.engines?.MAIN_ENGINE_01?.temperature || 0}°C
                  </div>
                  <p className="text-xs text-gray-500">main engine</p>
                </CardContent>
              </Card>

              <Card data-testid="card-crew-metric">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2 text-purple-500" />
                    Crew
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-crew-count">
                    {selectedTwinData.currentState?.crew?.onboard || 0}
                  </div>
                  <p className="text-xs text-gray-500">on board</p>
                </CardContent>
              </Card>
            </div>

            {/* System Status */}
            <Card data-testid="card-system-status">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Machinery</h4>
                    {selectedTwinData.currentState?.machinery?.engines && 
                      Object.entries(selectedTwinData.currentState.machinery.engines).map(([engineId, engine]: [string, any]) => (
                        <div key={engineId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{engineId}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm" data-testid={`text-engine-load-${engineId}`}>
                              {(engine.load * 100).toFixed(0)}% load
                            </span>
                            <Badge 
                              variant={engine.temperature > 100 ? 'destructive' : 'default'}
                              data-testid={`badge-engine-status-${engineId}`}
                            >
                              {engine.temperature > 100 ? 'Hot' : 'Normal'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Generators</h4>
                    {selectedTwinData.currentState?.machinery?.generators && 
                      Object.entries(selectedTwinData.currentState.machinery.generators).map(([genId, generator]: [string, any]) => (
                        <div key={genId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{genId}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm" data-testid={`text-generator-voltage-${genId}`}>
                              {generator.voltage}V
                            </span>
                            <Badge 
                              variant={generator.voltage > 0 ? 'default' : 'destructive'}
                              data-testid={`badge-generator-status-${genId}`}
                            >
                              {generator.voltage > 0 ? 'Online' : 'Offline'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="3d" className="space-y-4">
            <Card data-testid="card-3d-viewer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  3D Vessel Model - {selectedTwinData.name}
                </CardTitle>
                <CardDescription>
                  Interactive 3D visualization with real-time condition overlay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <canvas 
                    ref={canvasRef}
                    className="border border-gray-200 rounded-lg bg-slate-900"
                    data-testid="canvas-3d-viewer"
                  />
                </div>
                <div className="mt-4 flex justify-center space-x-2">
                  <Button size="sm" variant="outline" data-testid="button-rotate-view">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Rotate View
                  </Button>
                  <Button size="sm" variant="outline" data-testid="button-reset-view">
                    Reset View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulation" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Simulation Controls */}
              <Card data-testid="card-simulation-controls">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Play className="h-5 w-5 mr-2" />
                    Simulation Scenarios
                  </CardTitle>
                  <CardDescription>
                    Run physics-based simulations for different operational scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => startSimulation('maintenance')}
                    disabled={isSimulating}
                    data-testid="button-simulate-maintenance"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Maintenance Scenario
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => startSimulation('failure')}
                    disabled={isSimulating}
                    data-testid="button-simulate-failure"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Equipment Failure
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => startSimulation('optimization')}
                    disabled={isSimulating}
                    data-testid="button-simulate-optimization"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Route Optimization
                  </Button>
                </CardContent>
              </Card>

              {/* Simulation Results */}
              <Card data-testid="card-simulation-results">
                <CardHeader>
                  <CardTitle>Recent Simulations</CardTitle>
                  <CardDescription>
                    {simulations.length} simulation(s) for this twin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {simulations.length === 0 ? (
                      <p className="text-gray-500 text-sm" data-testid="text-no-simulations">
                        No simulations run yet. Start a scenario to see results.
                      </p>
                    ) : (
                      simulations.slice(0, 5).map((sim: TwinSimulation) => (
                        <div key={sim.id} className="p-3 border rounded-lg" data-testid={`simulation-${sim.id}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{sim.scenarioName}</span>
                            <Badge 
                              variant={sim.status === 'completed' ? 'default' : 
                                     sim.status === 'running' ? 'secondary' : 'destructive'}
                              data-testid={`badge-simulation-status-${sim.id}`}
                            >
                              {sim.status}
                            </Badge>
                          </div>
                          {sim.status === 'running' && (
                            <Progress 
                              value={sim.progressPercentage} 
                              className="h-2"
                              data-testid={`progress-simulation-${sim.id}`}
                            />
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Started: {new Date(sim.startTime).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}