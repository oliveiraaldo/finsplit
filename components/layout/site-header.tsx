'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <Image 
                src="/logotipo.png" 
                alt="FinSplit" 
                width={40} 
                height={40}
                className="w-8 h-8 sm:w-10 sm:h-10"
              />
              <span className="text-xl sm:text-2xl font-bold text-primary-600">FinSplit</span>
            </Link>
          </div>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">
              Funcionalidades
            </Link>
            <Link href="#pricing" className="text-gray-600 hover:text-primary-600 transition-colors">
              Preços
            </Link>
            <Link href="#video" className="text-gray-600 hover:text-primary-600 transition-colors">
              Como Funciona
            </Link>
          </nav>

          {/* Auth Buttons Desktop */}
          <div className="hidden md:flex space-x-4">
            <Link href="/auth/signin">
              <Button variant="ghost" className="text-gray-600 hover:text-primary-600">
                Entrar
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-primary-600 hover:bg-primary-700">
                Criar Conta Grátis
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                href="#features" 
                className="block px-3 py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Funcionalidades
              </Link>
              <Link 
                href="#pricing" 
                className="block px-3 py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Preços
              </Link>
              <Link 
                href="#video" 
                className="block px-3 py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Como Funciona
              </Link>
              <div className="border-t pt-3 mt-3">
                <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start mb-2">
                    Entrar
                  </Button>
                </Link>
                <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-primary-600 hover:bg-primary-700">
                    Criar Conta Grátis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
