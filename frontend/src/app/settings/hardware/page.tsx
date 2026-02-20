'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Monitor, Printer, Scale, Wifi, RefreshCcw, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import apiClient from '@/lib/axios';

export default function HardwareSettingsPage() {
    const [isCkecking, setIsChecking] = useState(false);
    const [hwStatus, setHwStatus] = useState({
        scale: { connected: false, name: 'Balanza de Peso', lastCheck: null as string | null },
        printer: { connected: false, name: 'Impresora de Tickets', lastCheck: null as string | null },
        internet: { connected: true, name: 'Conexión Cloud', lastCheck: null as string | null }
    });

    const checkHardware = async () => {
        setIsChecking(true);
        const now = new Date().toLocaleTimeString();

        try {
            // 1. Check Scale (Web Serial API)
            let scaleConnected = false;
            if ('serial' in navigator) {
                // @ts-ignore
                const ports = await navigator.serial.getPorts();
                scaleConnected = ports.length > 0;
            }

            // 2. Report to Backend
            await apiClient.post('/api/sales/diagnostics', {
                deviceName: 'Balanza',
                isConnected: scaleConnected
            });

            setHwStatus(prev => ({
                ...prev,
                scale: { ...prev.scale, connected: scaleConnected, lastCheck: now },
                internet: { ...prev.internet, connected: navigator.onLine, lastCheck: now }
            }));

            toast.success('Estado de periféricos actualizado');
        } catch (error) {
            toast.error('Error al verificar conexiones');
        } finally {
            setIsChecking(false);
        }
    };

    const testPrinter = async () => {
        // Marcamos como desconectado temporalmente mientras validamos
        setHwStatus(prev => ({ ...prev, printer: { ...prev.printer, connected: false } }));
        toast.info('Generando ticket de diagnóstico...');

        const printWindow = window.open('', '_blank', 'width=300,height=400');
        if (!printWindow) {
            toast.error('Bloqueador de ventanas detectado.');
            return;
        }

        const now = new Date();
        const content = `
            <html>
                <body style="font-family:monospace;width:80mm;text-align:center;padding:20px;">
                    <h3>PROFITZEN TEST</h3>
                    <p>VERIFICACIÓN DE HARDWARE</p>
                    <p>${now.toLocaleTimeString()}</p>
                    <hr>
                    <p>¿Se imprimió este ticket?</p>
                </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();

            // Mensaje de confirmación interactivo
            toast('¿Se imprimió el ticket físico?', {
                duration: 15000,
                action: {
                    label: 'SÍ, SE IMPRIMIÓ',
                    onClick: () => {
                        setHwStatus(prev => ({
                            ...prev,
                            printer: { ...prev.printer, connected: true, lastCheck: now.toLocaleTimeString() }
                        }));
                        toast.success('Ticketera validada correctamente');
                        apiClient.post('/api/sales/diagnostics', {
                            deviceName: 'Ticketera',
                            isConnected: true
                        });
                    }
                },
                cancel: {
                    label: 'NO/CANCELAR',
                    onClick: () => {
                        toast.error('La ticketera no pudo ser validada.');
                        apiClient.post('/api/sales/diagnostics', {
                            deviceName: 'Ticketera',
                            isConnected: false,
                            errorMessage: 'El usuario canceló la impresión o no salió el ticket.'
                        });
                    }
                }
            });
        }, 500);
    };

    const pairScale = async () => {
        if (!('serial' in navigator)) {
            toast.error('Navegador no compatible (usa Chrome/Edge)');
            return;
        }
        try {
            // @ts-ignore
            await navigator.serial.requestPort();
            checkHardware();
        } catch (err) {
            toast.error('Sincronización cancelada');
        }
    };

    useEffect(() => {
        checkHardware();
    }, []);

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto py-10 px-6">
                <div className="flex items-center justify-between mb-10 border-b border-border pb-8">
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight">Estado de la Terminal</h1>
                        <p className="text-muted-foreground mt-2">Valida la conexión de tus periféricos para una venta fluida.</p>
                    </div>
                    <Button
                        onClick={checkHardware}
                        disabled={isCkecking}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                    >
                        <RefreshCcw className={`mr-2 h-5 w-5 ${isCkecking ? 'animate-spin' : ''}`} />
                        {isCkecking ? 'Verificando...' : 'Verificar Conexiones'}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    {/* Tarjeta de Balanza */}
                    <Card className="border-2 hover:border-blue-500/30 transition-all bg-card/40 backdrop-blur-md shadow-xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="p-3 bg-orange-500/15 rounded-xl">
                                    <Scale className="h-6 w-6 text-orange-500" />
                                </div>
                                {hwStatus.scale.connected ? (
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                ) : (
                                    <XCircle className="h-6 w-6 text-red-500" />
                                )}
                            </div>
                            <CardTitle className="mt-6 text-xl">Balanza Serial</CardTitle>
                            <CardDescription>Conexión para productos por peso</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className={`text-2xl font-black ${hwStatus.scale.connected ? 'text-green-500' : 'text-red-400'}`}>
                                    {hwStatus.scale.connected ? 'CONECTADA' : 'NO DETECTADA'}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-bold flex items-center gap-2">
                                    <Clock className="h-3 w-3" /> ÚLTIMA SYNC: {hwStatus.scale.lastCheck || '---'}
                                </div>
                                <Button variant="outline" className="w-full font-bold border-2 hover:bg-blue-500/5 transition-colors" onClick={pairScale}>
                                    SINCRONIZAR BALANZA
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tarjeta de Ticketera */}
                    <Card className="border-2 hover:border-blue-500/30 transition-all bg-card/40 backdrop-blur-md shadow-xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="p-3 bg-blue-500/15 rounded-xl">
                                    <Printer className="h-6 w-6 text-blue-500" />
                                </div>
                                {hwStatus.printer.connected ? (
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-6 w-6 text-amber-500" />
                                )}
                            </div>
                            <CardTitle className="mt-6 text-xl">Ticketera</CardTitle>
                            <CardDescription>Impresora de recibos USB</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className={`text-2xl font-black ${hwStatus.printer.connected ? 'text-green-500' : 'text-amber-400'}`}>
                                    {hwStatus.printer.connected ? 'ACTIVA' : 'PENDIENTE TEST'}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-bold flex items-center gap-2">
                                    <Clock className="h-3 w-3" /> ÚLTIMA PRUEBA: {hwStatus.printer.lastCheck || '---'}
                                </div>
                                <Button variant="outline" className="w-full font-bold border-2 hover:bg-blue-500/5 transition-colors" onClick={testPrinter}>
                                    REALIZAR PRUEBA
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tarjeta de Red */}
                    <Card className="border-2 hover:border-blue-500/30 transition-all bg-card/40 backdrop-blur-md shadow-xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="p-3 bg-green-500/15 rounded-xl">
                                    <Wifi className="h-6 w-6 text-green-500" />
                                </div>
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                            </div>
                            <CardTitle className="mt-6 text-xl">Servicio Cloud</CardTitle>
                            <CardDescription>Sincronización con el servidor</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="text-2xl font-black text-green-500 uppercase italic">
                                    {hwStatus.internet.connected ? 'Conectado' : 'Offline'}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Estado de Tráfico</p>
                                    <div className="h-2 bg-green-500/10 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full w-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="bg-[#050510] border border-blue-900/30 rounded-2xl p-6 font-mono text-[11px] text-blue-400 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Monitor className="h-24 w-24" />
                    </div>
                    <div className="flex items-center gap-2 mb-4 border-b border-blue-900/30 pb-3">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${hwStatus.internet.connected && hwStatus.printer.connected ? 'bg-green-500' : 'bg-amber-500'}`} />
                        <span className="font-bold uppercase tracking-[0.3em] text-blue-200">Terminal Shell v1.0</span>
                    </div>
                    <div className="space-y-1.5 opacity-80">
                        <p className="text-blue-500">[{new Date().toLocaleTimeString()}] INICIO: Cargando drivers de periféricos...</p>
                        <p>[{new Date().toLocaleTimeString()}] CLOUD: Sincronizando estado con Backend Sales (OK)</p>

                        {/* Estado Dinámico de Balanza */}
                        <p className={hwStatus.scale.connected ? 'text-green-400' : 'text-amber-400/70'}>
                            [{new Date().toLocaleTimeString()}] STATUS_SCALE: {hwStatus.scale.connected ? 'Balanza vinculada y lista.' : 'Aviso: No se detectó balanza. Pesaje manual requerido.'}
                        </p>

                        {/* Estado Dinámico de Ticketera */}
                        <p className={hwStatus.printer.connected ? 'text-green-400' : 'text-red-400'}>
                            [{new Date().toLocaleTimeString()}] STATUS_PRINTER: {hwStatus.printer.connected ? 'Ticketera validada y activa.' : 'ALERTA: Sin ticketera. Los comprobantes solo serán digitales.'}
                        </p>

                        {/* Mensaje de Cierre Inteligente */}
                        <div className="pt-2">
                            {(!hwStatus.internet.connected) ? (
                                <p className="text-red-500 font-bold">[{new Date().toLocaleTimeString()}] HALT: Sin conexión a internet. Terminal bloqueada.</p>
                            ) : (hwStatus.printer.connected && hwStatus.scale.connected) ? (
                                <p className="text-green-400 font-bold tracking-wider">[{new Date().toLocaleTimeString()}] READY: Terminal Profitzen a plena capacidad.</p>
                            ) : (
                                <p className="text-amber-400 font-bold tracking-wide">[{new Date().toLocaleTimeString()}] READY (LIMITADO): Operando en modo de contingencia/digital.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
