import Link from 'next/link'
import Image from 'next/image'
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Mail, 
  Phone,
  MapPin
} from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center mb-4">
              <Image 
                src="/logotipo.png" 
                alt="FinSplit" 
                width={100} 
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>
            <p className="text-gray-400 mb-4 text-sm leading-relaxed">
              Controle de despesas em grupo simplificado e inteligente. 
              Divida gastos, organize finanças e mantenha todos informados com IA e WhatsApp.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Produto */}
          <div>
            <h4 className="font-semibold text-white mb-4">Produto</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="#features" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Funcionalidades
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Planos e Preços
                </Link>
              </li>
              <li>
                <Link href="#video" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Como Funciona
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Documentação
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="font-semibold text-white mb-4">Empresa</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Carreiras
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/help" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Central de Ajuda
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Suporte Técnico
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:contato@finsplit.app" 
                  className="text-gray-400 hover:text-primary-400 transition-colors flex items-center"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  contato@finsplit.app
                </a>
              </li>
              <li>
                <a 
                  href="https://wa.me/5511999999999" 
                  className="text-gray-400 hover:text-primary-400 transition-colors flex items-center"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  (11) 99999-9999
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; 2024 FinSplit. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Política de Privacidade
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Termos de Serviço
              </Link>
              <Link href="/cookies" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
