'use client';

import { useRef } from 'react';

interface TicketData {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  entryDate: string;
  entryTime: string;
  motivoCategoria: string;
  motivoDescripcion: string;
}

interface ThermalTicketProps {
  data: TicketData;
  onClose: () => void;
}

export default function ThermalTicket({ data, onClose }: ThermalTicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (ticketRef.current) {
      const printWindow = window.open('', '', 'width=302,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Ticket de Acceso - ${data.id}</title>
              <style>
                @media print {
                  @page {
                    size: 80mm auto;
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                  }
                }
                body {
                  font-family: 'Courier New', monospace;
                  width: 80mm;
                  margin: 0;
                  padding: 0;
                  background: white;
                  color: black;
                }
                .ticket {
                  padding: 10px;
                  padding-bottom: 20px;
                  font-size: 15px;
                  line-height: 1.5;
                }
                .header {
                  text-align: center;
                  border-bottom: 2px dashed black;
                  padding-bottom: 10px;
                  margin-bottom: 10px;
                }
                .title {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 6px;
                }
                .subtitle {
                  font-size: 14px;
                  margin-bottom: 4px;
                }
                .id-section {
                  text-align: center;
                  margin: 10px 0;
                  padding: 8px;
                  border: 2px solid black;
                }
                .id-label {
                  font-size: 13px;
                  margin-bottom: 4px;
                }
                .id-value {
                  font-size: 24px;
                  font-weight: bold;
                  letter-spacing: 3px;
                }
                .info-row {
                  margin: 8px 0;
                  border-bottom: 1px dotted black;
                  padding-bottom: 6px;
                }
                .label {
                  font-weight: bold;
                  font-size: 14px;
                }
                .value {
                  font-size: 15px;
                  margin-top: 4px;
                }
                .footer {
                  text-align: center;
                  margin-top: 15px;
                  padding-top: 10px;
                  padding-bottom: 8px;
                  border-top: 2px dashed black;
                  font-size: 11px;
                }
                .barcode {
                  text-align: center;
                  font-size: 24px;
                  font-weight: bold;
                  letter-spacing: 1px;
                  margin: 8px 0;
                  font-family: 'Libre Barcode 128', monospace;
                }
              </style>
            </head>
            <body>
              <div class="ticket">
                <div class="header">
                  <div class="title">aXeso</div>
                  <div class="subtitle">POLICÍA NACIONAL - DCHPEF</div>
                </div>
                
                <div class="id-section">
                  <div class="id-label">TICKET DE ACCESO</div>
                  <div class="id-value">${data.id}</div>
                </div>
                
                <div class="info-row">
                  <div class="label">VISITANTE:</div>
                  <div class="value">${data.nombres} ${data.apellidos}</div>
                </div>
                
                <div class="info-row">
                  <div class="label">NÚMERO DE DOCUMENTO:</div>
                  <div class="value">${data.cedula}</div>
                </div>
                
                <div class="info-row">
                  <div class="label">FECHA Y HORA DE INGRESO:</div>
                  <div class="value">${data.entryDate} - ${data.entryTime}</div>
                </div>
                
                <div class="info-row">
                  <div class="label">MOTIVO:</div>
                  <div class="value">${data.motivoCategoria}</div>
                </div>
                
                <div class="info-row">
                  <div class="label">DESCRIPCIÓN:</div>
                  <div class="value">${data.motivoDescripcion}</div>
                </div>
                
                <div class="footer">
                  <div>Conserve este ticket durante su visita</div>
                  <div>Debe presentarlo al momento de salir</div>
                  <div style="border-bottom: 2px dashed black; margin-top: 10px;"></div>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        // Pequeño delay para asegurar que el contenido se cargue
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 mt-8 mb-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-800">Vista Previa del Ticket</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl overflow-hidden mb-6 p-3">
            <div className="text-center mb-3">
              <p className="text-sm text-slate-600 font-medium">Vista previa para impresora térmica 80mm</p>
            </div>
            <div 
              ref={ticketRef}
              className="bg-white p-4 pb-6 font-mono text-sm mx-auto shadow-lg text-black"
              style={{ width: '280px' }}
            >
              <div className="text-center border-b-2 border-dashed border-black pb-3 mb-3">
                <div className="font-bold text-lg mb-1 text-black">aXeso</div>
                <div className="text-xs text-black">POLICÍA NACIONAL - DCHPEF</div>
              </div>
              
              <div className="text-center my-3 p-3 border-2 border-black">
                <div className="text-xs mb-1 text-black">TICKET DE ACCESO</div>
                <div className="font-bold text-lg tracking-widest text-black">{data.id}</div>
              </div>
              
              <div className="space-y-2">
                <div className="border-b border-dotted border-black pb-1">
                  <div className="font-bold text-sm text-black">VISITANTE:</div>
                  <div className="text-sm mt-1 text-black">{data.nombres} {data.apellidos}</div>
                </div>
                
                <div className="border-b border-dotted border-black pb-1">
                  <div className="font-bold text-sm text-black">NÚMERO DE DOCUMENTO:</div>
                  <div className="text-sm mt-1 text-black">{data.cedula}</div>
                </div>
                
                <div className="border-b border-dotted border-black pb-1">
                  <div className="font-bold text-sm text-black">FECHA Y HORA DE INGRESO:</div>
                  <div className="text-sm mt-1 text-black">{data.entryDate} - {data.entryTime}</div>
                </div>
                
                <div className="border-b border-dotted border-black pb-1">
                  <div className="font-bold text-sm text-black">MOTIVO:</div>
                  <div className="text-sm mt-1 text-black">{data.motivoCategoria}</div>
                </div>
                
                <div className="border-b border-dotted border-black pb-1">
                  <div className="font-bold text-sm text-black">DESCRIPCIÓN:</div>
                  <div className="text-sm mt-1 break-words text-black">{data.motivoDescripcion}</div>
                </div>
              </div>
              
              <div className="text-center mt-4 pt-3 pb-2 border-t-2 border-dashed border-black text-xs">
                <div className="text-black">Conserve este ticket durante su visita</div>
                <div className="text-black">Debe presentarlo al momento de salir</div>
                <div className="border-b-2 border-dashed border-black mt-3"></div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir Ticket
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

